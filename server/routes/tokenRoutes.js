const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const createTokenRoutes = (io) => {
  const router = express.Router();

  router.post("/", authMiddleware, async (req, res) => {
    const connection = await db.getConnection();

    try {
      const { serviceId } = req.body;
      const userId = req.user.id;

      if (!serviceId) {
        return res.status(400).json({
          message: "serviceId is required",
        });
      }

      await connection.beginTransaction();

      const [services] = await connection.query(
        "SELECT id FROM services WHERE id = ? AND is_active = TRUE",
        [serviceId],
      );

      if (services.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          message: "Service not found",
        });
      }

      const [existingTokens] = await connection.query(
        `SELECT id, token_number, status
             FROM tokens
             WHERE user_id = ?
             AND service_id = ?
             AND status IN ('WAITING', 'IN_PROGRESS')`,
        [userId, serviceId],
      );

      if (existingTokens.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message: "You already have an active token for this service",
          token: existingTokens[0],
        });
      }

      const [lastToken] = await connection.query(
        `SELECT token_number
             FROM tokens
             WHERE service_id = ?
             ORDER BY token_number DESC
             LIMIT 1
             FOR UPDATE`,
        [serviceId],
      );

      const nextTokenNumber =
        lastToken.length > 0 ? lastToken[0].token_number + 1 : 1;

      const [result] = await connection.query(
        `INSERT INTO tokens
             (service_id, user_id, token_number)
             VALUES (?, ?, ?)`,
        [serviceId, userId, nextTokenNumber],
      );

      await connection.commit();

      io.to(`service_${serviceId}`).emit("queue_updated", {
        serviceId: Number(serviceId),
        tokenNumber: nextTokenNumber,
        status: "WAITING",
      });

      res.status(201).json({
        message: "Token created successfully",
        token: {
          id: result.insertId,
          serviceId,
          userId,
          tokenNumber: nextTokenNumber,
          status: "WAITING",
        },
      });
    } catch (error) {
      await connection.rollback();

      console.error(error);

      res.status(500).json({
        message: "Failed to create token",
      });
    } finally {
      connection.release();
    }
  });
  router.get("/status", authMiddleware, async (req, res) => {
    try {
      const { serviceId } = req.query;
      const userId = req.user.id;

      if (!serviceId) {
        return res.status(400).json({
          message: "serviceId is required",
        });
      }

      const [userTokens] = await db.query(
        `SELECT id, token_number, status
             FROM tokens
             WHERE user_id = ?
             AND service_id = ?
             AND status IN ('WAITING', 'IN_PROGRESS')
             ORDER BY id DESC
             LIMIT 1`,
        [userId, serviceId],
      );

      if (userTokens.length === 0) {
        return res.status(404).json({
          message: "You do not have an active token for this service",
        });
      }

      const userToken = userTokens[0];

      const [servingTokens] = await db.query(
        `SELECT token_number
             FROM tokens
             WHERE service_id = ?
             AND status = 'IN_PROGRESS'
             ORDER BY called_at DESC
             LIMIT 1`,
        [serviceId],
      );

      const nowServing =
        servingTokens.length > 0 ? servingTokens[0].token_number : 0;

      let peopleAhead = 0;

      if (userToken.status === "WAITING") {
        const [ahead] = await db.query(
          `SELECT COUNT(*) AS count
                 FROM tokens
                 WHERE service_id = ?
                 AND status = 'WAITING'
                 AND token_number < ?`,
          [serviceId, userToken.token_number],
        );

        peopleAhead = ahead[0].count;
      }

      const [serviceData] = await db.query(
        `SELECT avg_service_time_min
             FROM services
             WHERE id = ?`,
        [serviceId],
      );

      const avgTime =
        serviceData.length > 0 ? serviceData[0].avg_service_time_min : 5;

      const estimatedWaitMinutes = peopleAhead * avgTime;

      res.json({
        tokenId: userToken.id,
        nowServing,
        waitingCount: peopleAhead,
        userToken: userToken.token_number,
        peopleAhead,
        estimatedWaitMinutes,
        status: userToken.status,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch queue status",
      });
    }
  });
  router.patch("/:id/cancel", authMiddleware, async (req, res) => {
    try {
      const tokenId = req.params.id;
      const userId = req.user.id;

      const [tokens] = await db.query(
        `SELECT id, status
             FROM tokens
             WHERE id = ?
             AND user_id = ?`,
        [tokenId, userId],
      );

      if (tokens.length === 0) {
        return res.status(404).json({
          message: "Token not found",
        });
      }

      if (!["WAITING", "IN_PROGRESS"].includes(tokens[0].status)) {
        return res.status(400).json({
          message: "Token cannot be cancelled",
        });
      }

      await db.query(
        `UPDATE tokens
             SET status = 'CANCELLED'
             WHERE id = ?`,
        [tokenId],
      );
      const [tokenData] = await db.query(
        `SELECT service_id, token_number
     FROM tokens
     WHERE id = ?`,
        [tokenId],
      );

      io.to(`service_${tokenData[0].service_id}`).emit("queue_updated", {
        serviceId: tokenData[0].service_id,
        tokenNumber: tokenData[0].token_number,
        status: "CANCELLED",
      });

      res.json({
        message: "Token cancelled successfully",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to cancel token",
      });
    }
  });
  return router;
};

module.exports = createTokenRoutes;
