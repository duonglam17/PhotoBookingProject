const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDirectory = path.join(__dirname, "../public/images/uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, "img-" + unique + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) return cb(null, true);
    cb(new Error("Chỉ chấp nhận file ảnh JPG, PNG, GIF hoặc WEBP."));
  },
});

router.post(
  "/upload",
  (req, res, next) => upload.single("image")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message });
    next();
  }),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Chưa chọn file ảnh." });
    res.status(201).json({
      message: "Upload thành công",
      url: "/images/uploads/" + req.file.filename,
      filename: req.file.filename,
    });
  },
);

module.exports = router;