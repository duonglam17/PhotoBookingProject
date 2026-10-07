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
    (
      SELECT pp.photo_url FROM photographer_photos pp
      WHERE pp.photographer_id = p.photographer_id
      ORDER BY pp.photo_id LIMIT 1
    ) AS avatar,
    COALESCE(d.cover_url, (
      SELECT pp.photo_url FROM photographer_photos pp
      WHERE pp.photographer_id = p.photographer_id
      ORDER BY pp.photo_id LIMIT 1
    )) AS cover,
    COALESCE(d.bio, '') AS bio,
    COALESCE(d.specialties, '') AS specialties,
    COALESCE(d.languages, '') AS languages,
    COALESCE(d.work_style, '') AS workStyle,
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
  LEFT JOIN photographer_profile_details d ON d.photographer_id = p.photographer_id
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

async function getPhotographerPhotos(photographerId) {
  const [photos] = await db.execute(
    "SELECT photo_url AS url FROM photographer_photos WHERE photographer_id = ? ORDER BY photo_id",
    [photographerId],
  );
  return photos.map((photo) => photo.url);
}

exports.updateOwnPhotographerProfile = async (req, res) => {
  const {
    location,
    experience,
    equipment,
    bio = '',
    specialties = '',
    languages = '',
    workStyle = '',
    coverUrl = null,
    photoUrls,
  } = req.body;
  const photoUrlPattern = /^\/images\/uploads\/[A-Za-z0-9._-]+$/;

  if (req.auth.role !== 'photographer') {
    return res.status(403).json({ success: false, message: 'Tài khoản này không phải nhiếp ảnh gia.' });
  }
  if (
    typeof location !== 'string' || !location.trim() || location.length > 255 ||
    typeof experience !== 'string' || !experience.trim() || experience.length > 50 ||
    typeof equipment !== 'string' || equipment.length > 5000 ||
    typeof bio !== 'string' || bio.length > 2000 ||
    typeof specialties !== 'string' || specialties.length > 255 ||
    typeof languages !== 'string' || languages.length > 255 ||
    typeof workStyle !== 'string' || workStyle.length > 100 ||
    !Array.isArray(photoUrls) || photoUrls.length > 12 ||
    photoUrls.some((url) => typeof url !== 'string' || !photoUrlPattern.test(url)) ||
    (coverUrl !== null && (typeof coverUrl !== 'string' || !photoUrlPattern.test(coverUrl)))
  ) {
    return res.status(400).json({ success: false, message: 'Thông tin hồ sơ hoặc danh sách ảnh không hợp lệ.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [profiles] = await connection.execute(
      'SELECT photographer_id FROM photographer_profiles WHERE user_id = ?',
      [req.auth.userId],
    );
    if (!profiles.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Tài khoản chưa có hồ sơ nhiếp ảnh gia.' });
    }

    const photographerId = profiles[0].photographer_id;
    await connection.execute(
      'UPDATE photographer_profiles SET location = ?, experience = ?, equipment = ? WHERE photographer_id = ?',
      [location.trim(), experience.trim(), equipment.trim(), photographerId],
    );
    await connection.execute(
      `INSERT INTO photographer_profile_details
         (photographer_id, bio, specialties, languages, work_style, cover_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bio = VALUES(bio), specialties = VALUES(specialties),
         languages = VALUES(languages), work_style = VALUES(work_style), cover_url = VALUES(cover_url)`,
      [photographerId, bio.trim(), specialties.trim(), languages.trim(), workStyle.trim(), coverUrl],
    );
    await connection.execute('DELETE FROM photographer_photos WHERE photographer_id = ?', [photographerId]);
    for (const photoUrl of photoUrls) {
      await connection.execute(
        'INSERT INTO photographer_photos (photographer_id, photo_url) VALUES (?, ?)',
        [photographerId, photoUrl],
      );
    }
    await connection.commit();
    res.json({ success: true, message: 'Đã cập nhật hồ sơ nhiếp ảnh gia.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Lỗi khi cập nhật hồ sơ nhiếp ảnh gia:', error);
    res.status(500).json({ success: false, message: 'Không thể lưu hồ sơ nhiếp ảnh gia.' });
  } finally {
    if (connection) connection.release();
  }
};

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
    photographer.photos = await getPhotographerPhotos(photographer.id);
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
         (
           SELECT pp.photo_url FROM photographer_photos pp
           WHERE pp.photographer_id = p.photographer_id
           ORDER BY pp.photo_id LIMIT 1
         ) AS avatar,
         COALESCE(d.cover_url, (
           SELECT pp.photo_url FROM photographer_photos pp
           WHERE pp.photographer_id = p.photographer_id
           ORDER BY pp.photo_id LIMIT 1
         )) AS cover,
         COALESCE(d.bio, '') AS bio,
         COALESCE(d.specialties, '') AS specialties,
         COALESCE(d.languages, '') AS languages,
         COALESCE(d.work_style, '') AS workStyle,
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
      LEFT JOIN photographer_profile_details d ON d.photographer_id = p.photographer_id
       WHERE p.user_id = ?`,
      [req.auth.userId],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Tài khoản chưa có hồ sơ nhiếp ảnh gia." });
    }

    const photographer = normalizePhotographer(rows[0]);
    photographer.photos = await getPhotographerPhotos(photographer.id);
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