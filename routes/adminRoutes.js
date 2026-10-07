const express = require("express");
const adminController = require("../controllers/adminController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
router.use(requireAdmin);
router.get("/dashboard", adminController.getDashboard);
router.get("/photographers", adminController.listPhotographers);
router.get("/photographers/:id", adminController.getPhotographer);
router.patch("/photographers/:id/status", adminController.updatePhotographerStatus);
router.get("/bookings", adminController.listBookings);

module.exports = router;
