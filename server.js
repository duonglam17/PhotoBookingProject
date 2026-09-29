const express = require("express");
const cors = require("cors");
require("dotenv").config();

const bookingRoutes = require("./routes/bookingRoutes");
const blogRoutes = require("./routes/blogRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Phục vụ file giao diện tĩnh trong thư mục public

// Chỏ Route API
app.use("/api/bookings", bookingRoutes);
app.use("/api", blogRoutes);
app.use("/api", uploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
