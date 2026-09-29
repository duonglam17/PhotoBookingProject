const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const sqlFiles = [
  "schema.sql",
  "seed.sql",
  "sample-blog-posts.sql",
];

function splitSql(sql) {
  const statements = [];
  let statement = "";
  let inString = false;
  const quote = String.fromCharCode(39);

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (character === "\\" && inString) {
      statement += character + (sql[++index] || "");
      continue;
    }

    if (character === quote) {
      if (inString && sql[index + 1] === quote) {
        statement += character + sql[++index];
        continue;
      }
      inString = !inString;
      statement += character;
      continue;
    }

    if (character === ";" && !inString) {
      if (statement.trim()) statements.push(statement.trim());
      statement = "";
      continue;
    }

    statement += character;
  }

  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

async function setupDatabase() {
  const databaseName = process.env.DB_NAME || "photo_booking_db";
  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error("DB_NAME chỉ được chứa chữ cái, chữ số và dấu gạch dưới.");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${databaseName}\``);

    for (const fileName of sqlFiles) {
      const filePath = path.join(__dirname, "../database", fileName);
      const statements = splitSql(fs.readFileSync(filePath, "utf8"));
      for (const statement of statements) {
        if (/^USE\s+photo_booking_db\s*$/i.test(statement)) continue;
        await connection.query(statement);
      }
      console.log(`Applied ${fileName}`);
    }
  } finally {
    await connection.end();
  }
}

setupDatabase().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exitCode = 1;
});
