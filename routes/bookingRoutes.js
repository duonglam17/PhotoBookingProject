const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const requireAuth = require("../middleware/requireAuth");

router.get("/mine", requireAuth, bookingController.listMyBookings);
router.get("/photographer/notifications", requireAuth, bookingController.getPhotographerBookingNotifications);
router.get("/photographer/mine", requireAuth, bookingController.getPhotographerBookings);
router.patch("/photographer/:bookingId/confirm", requireAuth, bookingController.confirmPhotographerBooking);
router.patch("/:bookingId/cancel", requireAuth, bookingController.cancelBooking);
router.post("/", requireAuth, bookingController.createBooking);

module.exports = router;
