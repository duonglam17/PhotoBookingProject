const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.register = async (req, res) => {
  const {
    fullName,
    dob,
    email,
    phone,
    password,
    role = "client",
    location,
    experience,
    equipment,
    portfolioUrl,
    photoUrls = [],
  } = req.body;
  const accountRole = role === "photographer" ? "photographer" : role === "client" ? "client" : null;
  if (!accountRole) {
    return res.status(400).json({ message: "Vai trò đăng ký không hợp lệ." });
  }
  if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ message: "Vui lòng nhập họ tên, email, số điện thoại và mật khẩu." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }
  if (password.length < 8 || password.length > 32) {
    return res.status(400).json({ message: "Mật khẩu phải từ 8 đến 32 ký tự." });
  }
  if (dob) {
    const birthDate = new Date(`${dob}T00:00:00`);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear() -
      (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0);
    if (Number.isNaN(birthDate.getTime()) || age < 16) {
      return res.status(400).json({ message: "Người đăng ký phải từ đủ 16 tuổi trở lên." });
    }
  }
  if (accountRole === "photographer" && (!location?.trim() || !experience?.trim() || !equipment?.trim())) {
    return res.status(400).json({ message: "Vui lòng nhập địa điểm, kinh nghiệm và thiết bị chụp." });
  }
  if (accountRole === "photographer" && (
    !Array.isArray(photoUrls) ||
    photoUrls.length < 1 ||
    photoUrls.length > 12 ||
    photoUrls.some((url) => typeof url !== "string" || !/^\/images\/uploads\/[A-Za-z0-9._-]+$/.test(url))
  )) {
    return res.status(400).json({ message: "Vui lòng tải lên từ 1 đến 12 ảnh hợp lệ." });
  }
  if (accountRole === "photographer" && portfolioUrl?.trim()) {
    try {
      const parsedPortfolioUrl = new URL(portfolioUrl.trim());
      if (!['http:', 'https:'].includes(parsedPortfolioUrl.protocol)) throw new Error();
    } catch (error) {
      return res.status(400).json({ message: "Link portfolio phải bắt đầu bằng http:// hoặc https://." });
    }
  }

  let connection;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [existingUsers] = await connection.query(
      "SELECT user_id FROM users WHERE email = ? OR phone = ?",
      [email.trim(), phone.trim()],
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      transactionStarted = false;
      return res
        .status(400)
        .json({ message: "Email hoặc số điện thoại đã được đăng ký!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await connection.execute(
      `INSERT INTO users (full_name, dob, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName.trim(), dob || null, email.trim(), phone.trim(), hashedPassword, accountRole],
    );
    const newUserId = userResult.insertId;

    if (accountRole === "photographer") {
      const [profileResult] = await connection.execute(
        `INSERT INTO photographer_profiles
         (user_id, location, experience, equipment, portfolio_url, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [newUserId, location.trim(), experience.trim(), equipment.trim(), portfolioUrl?.trim() || null],
      );
      for (const photoUrl of photoUrls) {
        await connection.execute(
          "INSERT INTO photographer_photos (photographer_id, photo_url) VALUES (?, ?)",
          [profileResult.insertId, photoUrl],
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    res.status(201).json({
      success: true,
      message: accountRole === "photographer"
        ? "Đăng ký nhiếp ảnh gia thành công. Hồ sơ đang chờ xác minh."
        : "Đăng ký tài khoản thành công.",
      userId: newUserId,
      role: accountRole,
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error("Lỗi đăng ký:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email hoặc số điện thoại đã được đăng ký." });
    }
    res.status(500).json({ message: "Không thể tạo tài khoản. Hãy kiểm tra kết nối database." });
  } finally {
    if (connection) connection.release();
  }
};
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra xem người dùng có tồn tại không
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const user = users[0];

        // 2. So sánh mật khẩu người dùng nhập với mật khẩu đã mã hóa trong Database
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        let photographerId = null;
        if (user.role === 'photographer') {
          const [profiles] = await db.query(
            'SELECT photographer_id FROM photographer_profiles WHERE user_id = ?',
            [user.user_id]
          );
          photographerId = profiles[0]?.photographer_id || null;
        }

        const payload = {
            userId: user.user_id,
            role: user.role
        };

        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET || 'development-only-secret',
            { expiresIn: '24h' }
        );

        // 4. Trả về kết quả thành công
        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            token: token,
            user: {
                id: user.user_id,
                fullName: user.full_name,
                role: user.role,
                photographerId
            }
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi Server nội bộ.' });
    }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, full_name, role FROM users WHERE user_id = ?',
      [req.auth.userId]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const user = users[0];
    let photographerId = null;
    if (user.role === 'photographer') {
      const [profiles] = await db.query(
        'SELECT photographer_id FROM photographer_profiles WHERE user_id = ?',
        [user.user_id]
      );
      photographerId = profiles[0]?.photographer_id || null;
    }

    res.json({
      success: true,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        role: user.role,
        photographerId,
      },
    });
  } catch (error) {
    console.error('Lỗi tải tài khoản hiện tại:', error);
    res.status(500).json({ success: false, message: 'Không thể tải thông tin tài khoản.' });
  }
};
