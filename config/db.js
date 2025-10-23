const mysql = require('mysql2/promise');
require('dotenv').config();

const isProduction = !!process.env.MYSQLHOST;

// 커넥션 풀 생성
const connectionConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_DATABASE,
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (isProduction) {
  connectionConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(connectionConfig);

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  pool,
};