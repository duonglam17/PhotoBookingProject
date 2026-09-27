const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // Mặc định của XAMPP là rỗng
  database: "photo_booking_db",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();
