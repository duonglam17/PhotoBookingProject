const db = require("../config/db");

// Hàm tạo đơn đặt lịch mới (POST /api/bookings)
exports.createBooking = async (req, res) => {
  try {
    const {
      userId,
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
    } = req.body;

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
    });

    // 2. Tạo mã booking_code ngẫu nhiên (Ví dụ: BK-8F2A)
    const bookingCode =
      "BK-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    // 3. Thực thi câu lệnh SQL chèn vào bảng Bookings
    const sql = `
      INSERT INTO Bookings (booking_code, user_id, package_id, booking_date, start_time, location, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const [result] = await db.execute(sql, [
      bookingCode,
      Number(userId),
      Number(packageId),
      bookingDate,
      startTime,
      location.trim(),
      bookingDetails,
    ]);

    // 4. Trả kết quả về Frontend
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
