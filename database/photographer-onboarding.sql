USE photo_booking_db;

CREATE TABLE IF NOT EXISTS Photographer_Profile_Details (
  user_id INT NOT NULL PRIMARY KEY,
  gender VARCHAR(30) NOT NULL,
  address VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  portfolio_url VARCHAR(500) NOT NULL,
  languages JSON NOT NULL,
  categories JSON NOT NULL,
  work_model VARCHAR(40) NOT NULL,
  experience_details VARCHAR(200) NOT NULL DEFAULT '',
  introduction VARCHAR(200) NOT NULL,
  identity_front VARCHAR(255) NOT NULL,
  identity_back VARCHAR(255) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  bank_account VARCHAR(80) NOT NULL,
  bank_holder VARCHAR(120) NOT NULL,
  tax_code VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);