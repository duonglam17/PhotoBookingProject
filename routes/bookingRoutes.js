const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

// Khai báo Route tạo đơn
router.post("/", bookingController.createBooking);

module.exports = router;
