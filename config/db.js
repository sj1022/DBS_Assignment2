const mysql = require('mysql2/promise');
require('dotenv').config();

// 커넥션 풀 생성
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306, // MySQL 기본 포트는 3306입니다.
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  pool,
};