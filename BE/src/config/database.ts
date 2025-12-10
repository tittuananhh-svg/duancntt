import mysql from 'mysql2/promise';
import { ENV } from './env';

export const pool = mysql.createPool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  user: ENV.DB_USER,
  password: ENV.DB_PASS,
  database: ENV.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('✅ MySQL connection pool created:', {
  host: ENV.DB_HOST,
  database: ENV.DB_NAME,
});