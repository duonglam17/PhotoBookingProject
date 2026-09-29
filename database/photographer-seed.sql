USE photo_booking_db;

CREATE TABLE IF NOT EXISTS Photographer_Directory (
  photographer_id INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(500) NOT NULL,
  cover_url VARCHAR(500) NOT NULL,
  bio TEXT NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  review_count INT NOT NULL DEFAULT 0,
  booking_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  locations JSON NOT NULL,
  experience VARCHAR(80) NOT NULL DEFAULT 'Từ 1-3 năm',
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Photographer_Directory
  (display_name, avatar_url, cover_url, bio, rating, review_count, booking_count, like_count, locations, experience)
SELECT *
FROM (
  SELECT 'Thoanchucuẩng.graph', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85', 'Mình là Thường, chuyên chụp ký yếu, tốt nghiệp cao đẳng, sự kiện, rất mong được kết nối với bạn.', 5.0, 2, 3, 3, JSON_ARRAY('Hà Nội', 'Quảng Ninh', 'Bắc Ninh'), 'Từ 1-3 năm'
  UNION ALL SELECT 'mạnh nguyen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85', 'Hãy để cảm xúc trở thành những khoảnh khắc đáng nhớ trong từng khung hình.', 5.0, 1, 1, 1, JSON_ARRAY('Hà Nội', 'Ninh Bình', 'Hải Phòng'), 'Từ 1-3 năm'
  UNION ALL SELECT 'Trần Hải Anh', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85', 'Một Photographer yêu thích những khoảnh khắc của tình yêu.', 5.0, 5, 5, 5, JSON_ARRAY('Hà Nội'), 'Trên 3 năm'
  UNION ALL SELECT 'Thưới', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85', 'Ghi lại những khoảnh khắc tự nhiên, nhẹ nhàng và nhiều năng lượng.', 4.9, 8, 9, 12, JSON_ARRAY('Hà Nội', 'Hải Dương'), 'Từ 1-3 năm'
  UNION ALL SELECT 'Lê Đức photo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', 'Ảnh chân dung, lifestyle và những bộ ảnh ngoài trời giàu màu sắc.', 4.8, 4, 8, 10, JSON_ARRAY('Hà Nội', 'Hưng Yên'), 'Trên 3 năm'
  UNION ALL SELECT 'Bình nguyễn', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85', 'Luôn vui tươi và tràn đầy cảm hứng trong mỗi buổi chụp.', 4.8, 13, 30, 22, JSON_ARRAY('TP. Hồ Chí Minh'), 'Trên 5 năm'
  UNION ALL SELECT 'Mắt tròn thích đi chụp', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=85', 'Vui vẻ, chăm chút và tỉ mỉ trong từng khung hình.', 5.0, 7, 14, 22, JSON_ARRAY('Hà Nội', 'Hưng Yên'), 'Trên 3 năm'
  UNION ALL SELECT 'Tuấn Anh', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85', 'Nhiếp ảnh gia kinh nghiệm, luôn đặt tâm vào từng khung hình để mang lại sự tự nhiên.', 5.0, 5, 2, 5, JSON_ARRAY('Hà Nội'), 'Trên 5 năm'
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM Photographer_Directory existing
  WHERE existing.display_name = seed.display_name
);