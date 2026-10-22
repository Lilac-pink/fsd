const express = require("express");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const [services] = await db.query(
      `SELECT 
                id,
                name,
                location,
                avg_service_time_min,
                is_active
             FROM services
             WHERE is_active = TRUE
             ORDER BY id`,
    );

    res.json(services);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch services",
    });
  }
});

module.exports = router;
