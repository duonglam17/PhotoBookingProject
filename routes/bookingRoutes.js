const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const requireAuth = require("../middleware/requireAuth");

router.get("/mine", requireAuth, bookingController.listMyBookings);
router.post("/", requireAuth, bookingController.createBooking);

module.exports = router;
