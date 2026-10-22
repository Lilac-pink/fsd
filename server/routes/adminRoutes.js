const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const createAdminRoutes = (io) => {
  const router = express.Router();

  router.get(
    "/queue/:serviceId",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const serviceId = req.params.serviceId;

        const [queue] = await db.query(
          `SELECT
              tokens.id,
              tokens.token_number,
              users.name,
              users.email,
              tokens.status,
              tokens.created_at,
              tokens.called_at
           FROM tokens
           JOIN users
              ON tokens.user_id = users.id
           WHERE tokens.service_id = ?
           ORDER BY tokens.token_number`,
          [serviceId],
        );

        res.json(queue);
      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Failed to fetch queue",
        });
      }
    },
  );

  router.post(
    "/call-next",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      const connection = await db.getConnection();

      try {
        const { serviceId } = req.body;

        if (!serviceId) {
          return res.status(400).json({
            message: "serviceId is required",
          });
        }

        await connection.beginTransaction();

        const [waitingTokens] = await connection.query(
          `SELECT id, token_number, user_id
           FROM tokens
           WHERE service_id = ?
           AND status = 'WAITING'
           ORDER BY token_number
           LIMIT 1
           FOR UPDATE`,
          [serviceId],
        );

        if (waitingTokens.length === 0) {
          await connection.rollback();

          return res.status(404).json({
            message: "No waiting tokens",
          });
        }

        const token = waitingTokens[0];

        await connection.query(
          `UPDATE tokens
           SET status = 'IN_PROGRESS',
               called_at = NOW()
           WHERE id = ?`,
          [token.id],
        );

        await connection.commit();

        console.log("Emitting queue_updated to:", `service_${serviceId}`);

        io.to(`service_${serviceId}`).emit("queue_updated", {
          serviceId: Number(serviceId),
          tokenNumber: token.token_number,
          status: "IN_PROGRESS",
        });
        io.to(`user_${token.user_id}`).emit("your_turn", {
          serviceId: Number(serviceId),
          tokenNumber: token.token_number,
          message: "It's your turn!",
        });

        res.json({
          message: "Next token called",
          token: {
            id: token.id,
            tokenNumber: token.token_number,
            userId: token.user_id,
            status: "IN_PROGRESS",
          },
        });
      } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
          message: "Failed to call next token",
        });
      } finally {
        connection.release();
      }
    },
  );

  router.post("/skip", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { tokenId } = req.body;

      if (!tokenId) {
        return res.status(400).json({
          message: "tokenId is required",
        });
      }

      const [tokens] = await db.query(
        `SELECT id, token_number, status
           FROM tokens
           WHERE id = ?`,
        [tokenId],
      );

      if (tokens.length === 0) {
        return res.status(404).json({
          message: "Token not found",
        });
      }

      const token = tokens[0];

      if (token.status !== "IN_PROGRESS") {
        return res.status(400).json({
          message: "Only an in-progress token can be skipped",
        });
      }

      await db.query(
        `UPDATE tokens
           SET status = 'NO_SHOW',
               completed_at = NOW()
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
        status: "NO_SHOW",
      });

      res.json({
        message: "Token skipped successfully",
        token: {
          id: token.id,
          tokenNumber: token.token_number,
          status: "NO_SHOW",
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to skip token",
      });
    }
  });

  router.post(
    "/complete",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      const connection = await db.getConnection();

      try {
        const { tokenId } = req.body;

        if (!tokenId) {
          return res.status(400).json({
            message: "tokenId is required",
          });
        }

        await connection.beginTransaction();

        const [tokens] = await connection.query(
          `SELECT
              id,
              service_id,
              token_number,
              created_at,
              called_at,
              status
           FROM tokens
           WHERE id = ?
           FOR UPDATE`,
          [tokenId],
        );

        if (tokens.length === 0) {
          await connection.rollback();

          return res.status(404).json({
            message: "Token not found",
          });
        }

        const token = tokens[0];

        if (token.status !== "IN_PROGRESS") {
          await connection.rollback();

          return res.status(400).json({
            message: "Only an in-progress token can be completed",
          });
        }

        await connection.query(
          `UPDATE tokens
           SET status = 'COMPLETED',
               completed_at = NOW()
           WHERE id = ?`,
          [tokenId],
        );

        const [historyResult] = await connection.query(
          `INSERT INTO queue_history
           (token_id, waiting_time, service_time)
           SELECT
               id,
               TIMESTAMPDIFF(MINUTE, created_at, called_at),
               TIMESTAMPDIFF(MINUTE, called_at, NOW())
           FROM tokens
           WHERE id = ?`,
          [tokenId],
        );

        await connection.commit();

        io.to(`service_${token.service_id}`).emit("queue_updated", {
          serviceId: token.service_id,
          tokenNumber: token.token_number,
          status: "COMPLETED",
        });

        res.json({
          message: "Token completed successfully",
          token: {
            id: token.id,
            tokenNumber: token.token_number,
            status: "COMPLETED",
          },
          historyId: historyResult.insertId,
        });
      } catch (error) {
        await connection.rollback();

        console.error(error);

        res.status(500).json({
          message: "Failed to complete token",
        });
      } finally {
        connection.release();
      }
    },
  );

  return router;
};

module.exports = createAdminRoutes;
