const db = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");

const RESET_CODE_TTL_MINUTES = 10;
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_RESEND_COOLDOWN_MS = 60_000;
const resetRequestWindows = new Map();

function getMailTransporter() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

function hashResetCode(userId, code) {
  return crypto.createHash("sha256")
    .update(`${userId}:${code}:${process.env.JWT_SECRET || "development-only-secret"}`)
    .digest("hex");
}

function allowResetRequest(ipAddress) {
  const now = Date.now();
  const windowStart = now - 15 * 60_000;
  const requests = (resetRequestWindows.get(ipAddress) || []).filter((time) => time > windowStart);
  if (requests.length >= 5) {
    resetRequestWindows.set(ipAddress, requests);
    return false;
  }
  requests.push(now);
  resetRequestWindows.set(ipAddress, requests);
  return true;
}

exports.requestPasswordReset = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập email hợp lệ." });
  }
  if (!allowResetRequest(req.ip || req.socket.remoteAddress || "unknown")) {
    return res.status(429).json({ success: false, message: "Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau 15 phút." });
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    return res.status(503).json({ success: false, message: "Email gửi mã chưa được cấu hình. Vui lòng liên hệ quản trị viên." });
  }

  try {
    const [users] = await db.execute(
      "SELECT user_id, full_name FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (!users.length) {
      return res.json({ success: true, message: "Nếu email tồn tại, mã xác nhận sẽ được gửi trong ít phút." });
    }

    const user = users[0];
    const [[existingCode]] = await db.execute(
      "SELECT requested_at FROM password_reset_codes WHERE user_id = ?",
      [user.user_id],
    );
    if (existingCode && Date.now() - new Date(existingCode.requested_at).getTime() < RESET_RESEND_COOLDOWN_MS) {
      return res.json({ success: true, message: "Nếu email tồn tại, mã xác nhận sẽ được gửi trong ít phút." });
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashResetCode(user.user_id, code);
    await db.execute(
      `INSERT INTO password_reset_codes (user_id, code_hash, requested_at, expires_at, attempts)
       VALUES (?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 0)
       ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), requested_at = CURRENT_TIMESTAMP,
         expires_at = VALUES(expires_at), attempts = 0`,
      [user.user_id, codeHash, RESET_CODE_TTL_MINUTES],
    );

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: "Mã xác nhận đặt lại mật khẩu Pdun.Foto",
        text: `Xin chào ${user.full_name},\n\nMã xác nhận đặt lại mật khẩu của bạn là: ${code}\nMã có hiệu lực trong ${RESET_CODE_TTL_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#19332b"><h2>Đặt lại mật khẩu Pdun.Foto</h2><p>Xin chào ${String(user.full_name).replace(/[&<>"']/g, "")},</p><p>Mã xác nhận của bạn:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#e96737">${code}</p><p>Mã có hiệu lực trong ${RESET_CODE_TTL_MINUTES} phút và chỉ sử dụng được một lần.</p><p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p></div>`,
      });
    } catch (error) {
      await db.execute("DELETE FROM password_reset_codes WHERE user_id = ?", [user.user_id]);
      throw error;
    }

    res.json({ success: true, message: "Nếu email tồn tại, mã xác nhận sẽ được gửi trong ít phút." });
  } catch (error) {
    console.error("Lỗi gửi mã đặt lại mật khẩu:", error.message);
    res.status(503).json({ success: false, message: "Chưa gửi được email xác nhận. Vui lòng thử lại sau ít phút." });
  }
};

exports.resetPassword = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const code = String(req.body.code || "").trim();
  const newPassword = String(req.body.newPassword || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, message: "Email hoặc mã xác nhận không hợp lệ." });
  }
  if (newPassword.length < 8 || newPassword.length > 32) {
    return res.status(400).json({ success: false, message: "Mật khẩu mới phải từ 8 đến 32 ký tự." });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    const [rows] = await connection.execute(
      `SELECT u.user_id AS userId, reset.code_hash AS codeHash,
        (reset.expires_at > CURRENT_TIMESTAMP) AS codeValid, reset.attempts
       FROM users u
       INNER JOIN password_reset_codes reset ON reset.user_id = u.user_id
       WHERE u.email = ? FOR UPDATE`,
      [email],
    );
    if (!rows.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: "Mã xác nhận không hợp lệ hoặc đã hết hạn." });
    }

    const reset = rows[0];
    if (Number(reset.attempts) >= RESET_CODE_MAX_ATTEMPTS || !Number(reset.codeValid)) {
      await connection.execute("DELETE FROM password_reset_codes WHERE user_id = ?", [reset.userId]);
      await connection.commit();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: "Mã xác nhận không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới." });
    }

    const submittedHash = Buffer.from(hashResetCode(reset.userId, code), "hex");
    const expectedHash = Buffer.from(reset.codeHash, "hex");
    if (submittedHash.length !== expectedHash.length || !crypto.timingSafeEqual(submittedHash, expectedHash)) {
      const nextAttempts = Number(reset.attempts) + 1;
      if (nextAttempts >= RESET_CODE_MAX_ATTEMPTS) {
        await connection.execute("DELETE FROM password_reset_codes WHERE user_id = ?", [reset.userId]);
      } else {
        await connection.execute("UPDATE password_reset_codes SET attempts = ? WHERE user_id = ?", [nextAttempts, reset.userId]);
      }
      await connection.commit();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: nextAttempts >= RESET_CODE_MAX_ATTEMPTS
        ? "Bạn đã nhập sai quá số lần cho phép. Hãy yêu cầu mã mới."
        : "Mã xác nhận không chính xác." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await connection.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [passwordHash, reset.userId]);
    await connection.execute("DELETE FROM password_reset_codes WHERE user_id = ?", [reset.userId]);
    await connection.commit();
    transactionStarted = false;
    res.json({ success: true, message: "Mật khẩu đã được đổi. Bạn có thể đăng nhập bằng mật khẩu mới." });
  } catch (error) {
    if (transactionStarted && connection) await connection.rollback();
    console.error("Lỗi đặt lại mật khẩu:", error.message);
    res.status(500).json({ success: false, message: "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại." });
  } finally {
    if (connection) connection.release();
  }
};

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
  let timedOut = false;
  let registrationTimeout;

  try {
    connection = await db.getConnection();
    registrationTimeout = setTimeout(() => {
      timedOut = true;
      connection.destroy();
      if (!res.headersSent) {
        res.status(503).json({ message: "Máy chủ cơ sở dữ liệu đang phản hồi chậm. Vui lòng thử lại sau ít phút." });
      }
    }, 20000);
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
    if (transactionStarted && !timedOut) await connection.rollback();
    console.error("Lỗi đăng ký:", error);
    if (timedOut || res.headersSent) return;
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email hoặc số điện thoại đã được đăng ký." });
    }
    res.status(500).json({ message: "Không thể tạo tài khoản. Hãy kiểm tra kết nối database." });
  } finally {
    clearTimeout(registrationTimeout);
    if (connection && !timedOut) connection.release();
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
