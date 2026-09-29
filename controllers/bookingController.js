const db = require("../config/db");
const crypto = require("crypto");

// Hàm tạo đơn đặt lịch mới (POST /api/bookings)
exports.createBooking = async (req, res) => {
  try {
    const {
      packageId,
      bookingDate,
      startTime,
      location,
      title,
      description,
      minBudget,
      maxBudget,
      notes,
      addOns,
      photographerId,
      referenceImage,
    } = req.body;
    const userId = req.auth.userId;

    // 1. Kiểm tra thông tin bắt buộc
    if (
      !Number.isInteger(Number(userId)) ||
      !Number.isInteger(Number(packageId)) ||
      !bookingDate ||
      !startTime ||
      !location?.trim() ||
      !title?.trim() ||
      !description?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ các thông tin bắt buộc!",
      });
    }

    const parsedPhotographerId = photographerId == null || photographerId === ""
      ? null
      : Number(photographerId);
    if (parsedPhotographerId !== null && (!Number.isInteger(parsedPhotographerId) || parsedPhotographerId < 1)) {
      return res.status(400).json({ success: false, message: "Nhiếp ảnh gia được chọn không hợp lệ." });
    }

    const [users] = await db.execute(
      "SELECT user_id, role FROM users WHERE user_id = ?",
      [Number(userId)],
    );
    if (!users.length || users[0].role !== "client") {
      return res.status(400).json({ success: false, message: "Tài khoản khách hàng không hợp lệ." });
    }

    const [packages] = await db.execute(
      "SELECT package_id FROM packages WHERE package_id = ? AND is_active = 1",
      [Number(packageId)],
    );
    if (!packages.length) {
      return res.status(400).json({ success: false, message: "Gói chụp không tồn tại hoặc đã ngừng hoạt động." });
    }

    if (parsedPhotographerId !== null) {
      const [photographers] = await db.execute(
        "SELECT photographer_id FROM photographer_profiles WHERE photographer_id = ? AND status = 'active'",
        [parsedPhotographerId],
      );
      if (!photographers.length) {
        return res.status(400).json({ success: false, message: "Nhiếp ảnh gia hiện chưa nhận đặt lịch." });
      }
    }

    const minimumBudget = Number(minBudget);
    const maximumBudget = Number(maxBudget);

    if (
      !Number.isFinite(minimumBudget) ||
      !Number.isFinite(maximumBudget) ||
      minimumBudget <= 0 ||
      maximumBudget < minimumBudget
    ) {
      return res.status(400).json({
        success: false,
        message: "Khoảng chi phí không hợp lệ!",
      });
    }

    const bookingDetails = JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      minBudget: minimumBudget,
      maxBudget: maximumBudget,
      addOns: Array.isArray(addOns) ? addOns : [],
      note: notes?.trim() || "",
      referenceImage: typeof referenceImage === "string" ? referenceImage : "",
    });

    const bookingCode = `BK-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    const sql = `
      INSERT INTO bookings
        (booking_code, user_id, package_id, photographer_id, booking_date, start_time, location, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const [result] = await db.execute(sql, [
      bookingCode,
      Number(userId),
      Number(packageId),
      parsedPhotographerId,
      bookingDate,
      startTime,
      location.trim(),
      bookingDetails,
    ]);

    res.status(201).json({
      success: true,
      message: "Đặt lịch thành công!",
      data: {
        bookingId: result.insertId,
        bookingCode: bookingCode,
      },
    });
  } catch (error) {
    console.error("Lỗi khi đặt lịch:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống, không thể tạo đơn đặt lịch.",
      error: error.message,
    });
  }
};

exports.listMyBookings = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         b.booking_id AS bookingId,
         b.booking_code AS bookingCode,
         b.booking_date AS bookingDate,
         b.start_time AS startTime,
         b.location,
         b.notes,
         b.status,
         b.created_at AS createdAt,
         p.package_name AS packageName,
         p.price AS packagePrice,
         u.full_name AS photographerName
       FROM bookings b
       INNER JOIN packages p ON p.package_id = b.package_id
       LEFT JOIN photographer_profiles pp ON pp.photographer_id = b.photographer_id
       LEFT JOIN users u ON u.user_id = pp.user_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.auth.userId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi tải lịch sử đặt lịch:", error);
    res.status(500).json({ success: false, message: "Không thể tải lịch sử đặt lịch." });
  }
};
