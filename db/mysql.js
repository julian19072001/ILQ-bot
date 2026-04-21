const mysql = require("mysql2/promise");

async function getDb() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
  });
}

async function getAllUserTables(db) {
  const [rows] = await db.execute(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_name LIKE 'user_%'
  `);

  return rows.map(r => r.table_name);
}

module.exports = { getDb, getAllUserTables };