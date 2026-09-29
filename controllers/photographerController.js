const db = require("../config/db");

const allowedSorts = {
  newest: "p.photographer_id DESC",
  bookings: "bookingCount DESC",
  rating: "rating DESC",
};

const baseSelect = `
  SELECT
    p.photographer_id AS id,
    u.full_name AS name,
    NULL AS avatar,
    NULL AS cover,
    p.equipment AS equipment,
    p.portfolio_url AS portfolioUrl,
    COALESCE((
      SELECT AVG(r.rating)
      FROM reviews r
      INNER JOIN bookings rb ON rb.booking_id = r.booking_id
      WHERE rb.photographer_id = p.photographer_id
    ), 0) AS rating,
    (
      SELECT COUNT(*)
      FROM reviews r
      INNER JOIN bookings rb ON rb.booking_id = r.booking_id
      WHERE rb.photographer_id = p.photographer_id
    ) AS reviewCount,
    (
      SELECT COUNT(*)
      FROM bookings b
      WHERE b.photographer_id = p.photographer_id
        AND b.status = 'completed'
    ) AS bookingCount,
    p.location AS locations,
    p.experience AS experience,
    (p.status = 'active') AS isVerified
  FROM photographer_profiles p
  INNER JOIN users u ON u.user_id = p.user_id
  WHERE p.status = 'active'
`;

function parseLocations(value) {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value || "null");
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    return String(value || "").split(/[,;|]/).map((location) => location.trim()).filter(Boolean);
  }
  return value ? [String(value).trim()] : [];
}

function normalizePhotographer(row) {
  return {
    ...row,
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.reviewCount),
    bookingCount: Number(row.bookingCount),
    isVerified: Boolean(row.isVerified),
    locations: parseLocations(row.locations),
  };
}

exports.listPhotographers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const location = String(req.query.location || "").trim();
    const sort = allowedSorts[req.query.sort] ? req.query.sort : "newest";
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 6, 1), 24);
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (search) {
      conditions.push("(u.full_name LIKE ? OR p.equipment LIKE ? OR p.location LIKE ?)");
      const searchValue = `%${search}%`;
      values.push(searchValue, searchValue, searchValue);
    }

    if (location) {
      conditions.push("p.location LIKE ?");
      values.push(`%${location}%`);
    }

    const whereClause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM photographer_profiles p
       INNER JOIN users u ON u.user_id = p.user_id
       WHERE p.status = 'active'${whereClause}`,
      values,
    );
    const total = Number(countRows[0].total);

    const [rows] = await db.execute(
      `${baseSelect}${whereClause} ORDER BY ${allowedSorts[sort]} LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    res.json({
      success: true,
      data: rows.map(normalizePhotographer),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhiếp ảnh gia:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tải danh sách nhiếp ảnh gia.",
    });
  }
};

exports.getPhotographer = async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ success: false, message: "Mã nhiếp ảnh gia không hợp lệ." });
    }
    const [rows] = await db.execute(`${baseSelect} AND photographer_id = ?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhiếp ảnh gia." });
    }

    const photographer = normalizePhotographer(rows[0]);
    const [reviews] = await db.execute(
      `SELECT r.rating, r.comment, r.created_at AS createdAt, u.full_name AS clientName
       FROM reviews r
       INNER JOIN bookings b ON b.booking_id = r.booking_id
       INNER JOIN users u ON u.user_id = b.user_id
       WHERE b.photographer_id = ? AND b.status = 'completed'
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [req.params.id],
    );
    res.json({ success: true, data: { ...photographer, reviews } });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin nhiếp ảnh gia:", error);
    res.status(500).json({ success: false, message: "Không thể tải thông tin nhiếp ảnh gia." });
  }
};

exports.getOwnPhotographerProfile = async (req, res) => {
  try {
    if (req.auth.role !== "photographer") {
      return res.status(403).json({ success: false, message: "Tài khoản này không phải nhiếp ảnh gia." });
    }

    const [rows] = await db.execute(
      `SELECT
         p.photographer_id AS id,
         u.full_name AS name,
         NULL AS avatar,
         NULL AS cover,
         p.equipment AS equipment,
         p.portfolio_url AS portfolioUrl,
         COALESCE((
           SELECT AVG(r.rating)
           FROM reviews r
           INNER JOIN bookings rb ON rb.booking_id = r.booking_id
           WHERE rb.photographer_id = p.photographer_id
         ), 0) AS rating,
         (
           SELECT COUNT(*)
           FROM reviews r
           INNER JOIN bookings rb ON rb.booking_id = r.booking_id
           WHERE rb.photographer_id = p.photographer_id
         ) AS reviewCount,
         (
           SELECT COUNT(*) FROM bookings b
           WHERE b.photographer_id = p.photographer_id AND b.status = 'completed'
         ) AS bookingCount,
         p.location AS locations,
         p.experience,
         (p.status = 'active') AS isVerified,
         p.status
       FROM photographer_profiles p
       INNER JOIN users u ON u.user_id = p.user_id
       WHERE p.user_id = ?`,
      [req.auth.userId],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Tài khoản chưa có hồ sơ nhiếp ảnh gia." });
    }

    const photographer = normalizePhotographer(rows[0]);
    const [reviews] = await db.execute(
      `SELECT r.rating, r.comment, r.created_at AS createdAt, u.full_name AS clientName
       FROM reviews r
       INNER JOIN bookings b ON b.booking_id = r.booking_id
       INNER JOIN users u ON u.user_id = b.user_id
       WHERE b.photographer_id = ? AND b.status = 'completed'
       ORDER BY r.created_at DESC LIMIT 20`,
      [photographer.id],
    );

    res.json({ success: true, data: { ...photographer, status: rows[0].status, reviews } });
  } catch (error) {
    console.error("Lỗi khi tải hồ sơ cá nhân nhiếp ảnh gia:", error);
    res.status(500).json({ success: false, message: "Không thể tải hồ sơ cá nhân." });
  }
};