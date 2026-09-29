const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để xem hồ sơ." });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET || "development-only-secret");
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
  }
};
