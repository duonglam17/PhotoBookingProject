const express = require("express");
const router = express.Router();
const photographerController = require("../controllers/photographerController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", photographerController.listPhotographers);
router.get("/me", requireAuth, photographerController.getOwnPhotographerProfile);
router.put("/me", requireAuth, photographerController.updateOwnPhotographerProfile);
router.get("/:id", photographerController.getPhotographer);

module.exports = router;