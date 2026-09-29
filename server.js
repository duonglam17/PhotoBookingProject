const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const photographerRoutes = require("./routes/photographerRoutes");
const blogRoutes = require("./routes/blogRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const healthRoutes = require("./routes/healthRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Chỏ Route API
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/photographers", photographerRoutes);
app.use("/api", catalogRoutes);
app.use("/api", blogRoutes);
app.use("/api", uploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
