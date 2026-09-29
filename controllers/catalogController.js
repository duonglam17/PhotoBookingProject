const db = require("../config/db");

exports.getPackages = async (req, res) => {
  try {
    const [packages] = await db.execute(
      `SELECT
         p.package_id AS id,
         p.service_id AS serviceId,
         p.package_name AS name,
         p.price,
         p.duration_minutes AS durationMinutes,
         p.max_edited_photos AS maxEditedPhotos,
         p.deliverables_description AS deliverablesDescription,
         s.service_name AS serviceName
       FROM packages p
       INNER JOIN services s ON s.service_id = p.service_id
       WHERE p.is_active = 1 AND s.is_active = 1
       ORDER BY p.package_id`,
    );

    res.json({ success: true, data: packages });
  } catch (error) {
    console.error("Lỗi tải gói chụp:", error);
    res.status(500).json({ success: false, message: "Không thể tải danh sách gói chụp." });
  }
};

exports.getServices = async (req, res) => {
  try {
    const [services] = await db.execute(
      "SELECT service_id AS id, service_name AS name, description FROM services WHERE is_active = 1 ORDER BY service_id",
    );
    res.json({ success: true, data: services });
  } catch (error) {
    console.error("Lỗi tải dịch vụ:", error);
    res.status(500).json({ success: false, message: "Không thể tải danh sách dịch vụ." });
  }
};
