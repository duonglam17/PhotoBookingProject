const express = require("express");
const catalogController = require("../controllers/catalogController");

const router = express.Router();

router.get("/packages", catalogController.getPackages);
router.get("/services", catalogController.getServices);

module.exports = router;
