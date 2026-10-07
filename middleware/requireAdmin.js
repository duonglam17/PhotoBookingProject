const requireAuth = require("./requireAuth");

module.exports = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập khu vực quản trị." });
    }
    next();
  });
};
