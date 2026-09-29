const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ success: true, database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(503).json({
      success: false,
      database: "disconnected",
      message: "Không kết nối được database. Hãy kiểm tra cấu hình .env và MySQL.",
    });
  }
});

module.exports = router;
