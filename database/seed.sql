USE photo_booking_db;

INSERT INTO services (service_name, description, is_active)
SELECT 'Chụp hình theo yêu cầu', 'Dịch vụ chụp hình cá nhân, cặp đôi, gia đình và sự kiện.', 1
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE service_name = 'Chụp hình theo yêu cầu'
);

SET @service_id = (
  SELECT service_id FROM services
  WHERE service_name = 'Chụp hình theo yêu cầu'
  LIMIT 1
);

INSERT INTO packages (
  service_id,
  package_name,
  price,
  duration_minutes,
  max_edited_photos,
  deliverables_description,
  is_active
)
SELECT @service_id, package_name, price, duration_minutes, max_edited_photos,
       deliverables_description, 1
FROM (
  SELECT 'Cá nhân' AS package_name, 900000 AS price, 90 AS duration_minutes, 10 AS max_edited_photos, 'Bộ ảnh cá nhân đã chỉnh màu.' AS deliverables_description
  UNION ALL SELECT 'Cặp đôi', 1700000, 120, 20, 'Bộ ảnh cặp đôi đã chỉnh màu.'
  UNION ALL SELECT 'Gia đình', 3000000, 150, 30, 'Bộ ảnh gia đình đã chỉnh màu.'
  UNION ALL SELECT 'Trẻ em', 1500000, 90, 15, 'Bộ ảnh trẻ em đã chỉnh màu.'
  UNION ALL SELECT 'Sự kiện', 4200000, 240, 50, 'Ảnh sự kiện đã chỉnh màu.'
  UNION ALL SELECT 'Studio', 2400000, 120, 25, 'Bộ ảnh studio đã chỉnh màu.'
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM packages existing
  WHERE existing.package_name = seed.package_name
);
