USE photo_booking_db;

-- Development-only sample accounts. Password for all rows: PotonowDemo2026!
INSERT IGNORE INTO users (full_name, email, phone, password_hash, role) VALUES
  ('Nguyễn Minh Anh', 'anh.photo@example.invalid', '0900000001', '$2b$10$kDBYGh2sLxFt0/c8VvbwpePCXMxhTssrxA.VR9F2Lf3Qr7BzgfCTC', 'photographer'),
  ('Trần Hải Nam', 'nam.photo@example.invalid', '0900000002', '$2b$10$kDBYGh2sLxFt0/c8VvbwpePCXMxhTssrxA.VR9F2Lf3Qr7BzgfCTC', 'photographer'),
  ('Lê Thu Hà', 'ha.photo@example.invalid', '0900000003', '$2b$10$kDBYGh2sLxFt0/c8VvbwpePCXMxhTssrxA.VR9F2Lf3Qr7BzgfCTC', 'photographer');

INSERT IGNORE INTO photographer_profiles (user_id, location, experience, equipment, portfolio_url, status)
SELECT u.user_id, sample.location, sample.experience, sample.equipment, NULL, 'active'
FROM users u
INNER JOIN (
  SELECT 'anh.photo@example.invalid' AS email, 'Hà Nội, Bắc Ninh' AS location, 'Từ 1-3 năm' AS experience, 'Sony A7 III, 35mm f/1.8' AS equipment
  UNION ALL SELECT 'nam.photo@example.invalid', 'TP. Hồ Chí Minh', 'Trên 3 năm', 'Canon EOS R6, RF 24-70mm f/2.8'
  UNION ALL SELECT 'ha.photo@example.invalid', 'Hà Nội, Hải Phòng', 'Trên 5 năm', 'Nikon Z6 II, 50mm f/1.8'
) AS sample ON sample.email = u.email;
