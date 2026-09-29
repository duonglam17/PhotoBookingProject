const db = require("../config/db");

const allowedSorts = {
  newest: "created_at DESC",
  bookings: "booking_count DESC",
  likes: "like_count DESC",
  rating: "rating DESC",
};

const baseSelect = `
  SELECT
    photographer_id AS id,
    display_name AS name,
    avatar_url AS avatar,
    cover_url AS cover,
    bio,
    rating,
    review_count AS reviewCount,
    booking_count AS bookingCount,
    like_count AS likeCount,
    locations,
    experience,
    is_verified AS isVerified
  FROM Photographer_Directory
  WHERE is_active = 1
`;

function parseLocations(value) {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    return JSON.parse(value || "[]");
  } catch (error) {
    return [];
  }
}

function normalizePhotographer(row) {
  return {
    ...row,
    rating: Number(row.rating),
    reviewCount: Number(row.reviewCount),
    bookingCount: Number(row.bookingCount),
    likeCount: Number(row.likeCount),
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
      conditions.push("(display_name LIKE ? OR bio LIKE ? OR locations LIKE ?)");
      const searchValue = `%${search}%`;
      values.push(searchValue, searchValue, searchValue);
    }

    if (location) {
      conditions.push("locations LIKE ?");
      values.push(`%${location}%`);
    }

    const whereClause = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM Photographer_Directory WHERE is_active = 1${whereClause}`,
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
    const [rows] = await db.execute(`${baseSelect} AND photographer_id = ?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhiếp ảnh gia." });
    }

    res.json({ success: true, data: normalizePhotographer(rows[0]) });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin nhiếp ảnh gia:", error);
    res.status(500).json({ success: false, message: "Không thể tải thông tin nhiếp ảnh gia." });
  }
};