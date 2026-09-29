const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.register = async (req, res) => {
  // 1. Nhận dữ liệu từ request body (khớp với JSON từ frontend)
  const {
    fullName,
    dob,
    email,
    phone,
    password,
    location,
    experience,
    equipment,
  } = req.body;

  // Lấy một kết nối (connection) riêng từ pool để thực hiện Transaction
  const connection = await db.getConnection();

  try {
    // Bắt đầu Transaction
    await connection.beginTransaction();

    // 2. Kiểm tra xem Email hoặc SĐT đã tồn tại chưa
    const [existingUsers] = await connection.query(
      "SELECT * FROM Users WHERE email = ? OR phone = ?",
      [email, phone],
    );

    if (existingUsers.length > 0) {
      // Nếu có lỗi logic, BẮT BUỘC phải Rollback trước khi return
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Email hoặc số điện thoại đã được đăng ký!" });
    }

    // 3. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Lưu vào bảng Users với role là 'photographer'
    const userSql = `
            INSERT INTO Users (full_name, dob, email, phone, password_hash, role) 
            VALUES (?, ?, ?, ?, ?, 'photographer')
        `;

    const [userResult] = await connection.execute(userSql, [
      fullName,
      dob || null, // Nếu không nhập ngày sinh thì lưu NULL
      email,
      phone,
      hashedPassword,
    ]);

    const newUserId = userResult.insertId; // Lấy ID của user vừa tạo

    // 5. Lưu tiếp vào bảng Photographer_Profiles bằng ID vừa lấy được
    const profileSql = `
            INSERT INTO Photographer_Profiles (user_id, location, experience, equipment) 
            VALUES (?, ?, ?, ?)
        `;

    await connection.execute(profileSql, [
      newUserId,
      location,
      experience,
      equipment,
    ]);

    // 6. Hoàn tất Transaction: Lưu chính thức vào Database
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản Nhiếp ảnh gia thành công!",
      userId: newUserId,
    });
  } catch (error) {
    // Nếu có BẤT KỲ lỗi nào (ví dụ: mất mạng, sai cú pháp SQL), hủy toàn bộ thay đổi
    await connection.rollback();
    console.error("Lỗi đăng ký (Đã Rollback):", error);
    res
      .status(500)
      .json({ message: "Lỗi Server nội bộ. Không thể tạo tài khoản." });
  } finally {
    // Luôn luôn phải trả lại connection cho pool dù thành công hay thất bại
    if (connection) connection.release();
  }
};
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra xem người dùng có tồn tại không
        const [users] = await db.query(
            'SELECT * FROM Users WHERE email = ?', 
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

        // 3. Tạo JSON Web Token (JWT)
        // Lưu ý: Cần có một SECRET_KEY cấu hình trong file .env (VD: JWT_SECRET=PotonowSecretKey2025)
        const payload = {
            userId: user.user_id,
            role: user.role
        };

        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET || 'fallback_secret_key', // Thay bằng biến môi trường thực tế
            { expiresIn: '24h' } // Token có hạn trong 24 giờ
        );

        // 4. Trả về kết quả thành công
        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            token: token,
            user: {
                id: user.user_id,
                fullName: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: 'Lỗi Server nội bộ.' });
    }
};
