const express = require("express");
const router = express.Router();
const photographerController = require("../controllers/photographerController");

router.get("/", photographerController.listPhotographers);
router.get("/:id", photographerController.getPhotographer);

module.exports = router;