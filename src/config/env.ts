import dotenv from 'dotenv';
dotenv.config(); // 👈 rất quan trọng, phải có trước khi đọc process.env

export const ENV = {
  API_PORT: process.env.API_PORT || 4000,

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASS: process.env.DB_PASS || '',
  DB_NAME: process.env.DB_NAME || 'ql_dang_ky_hoc',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh-secret'
};
