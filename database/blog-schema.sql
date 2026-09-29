USE photo_booking_db;

CREATE TABLE IF NOT EXISTS blog_categories (
  category_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_blog_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
  post_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NOT NULL,
  feature_image VARCHAR(500) NULL,
  category_id INT NULL,
  author_name VARCHAR(120) NULL,
  reading_time INT NOT NULL DEFAULT 5,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id),
  UNIQUE KEY uq_blog_posts_slug (slug),
  KEY ix_blog_posts_category_status_created (category_id, status, created_at),
  CONSTRAINT fk_blog_posts_category
    FOREIGN KEY (category_id) REFERENCES blog_categories(category_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO blog_categories (name, slug) VALUES
  ('Chân dung', 'chan-dung'),
  ('Cặp đôi', 'cap-doi'),
  ('Nhiếp ảnh gia', 'nhiep-anh-gia'),
  ('Kỹ thuật chụp', 'ky-thuat-chup'),
  ('Gia đình', 'gia-dinh')
ON DUPLICATE KEY UPDATE name = VALUES(name);
