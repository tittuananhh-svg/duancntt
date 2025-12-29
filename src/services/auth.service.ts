import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ENV } from '../config/env';
import { log } from 'console';

import { pool } from '../config/database';

// login
interface DbUser extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  email: string | null;
  role_id: number;
  user_type_id: number;
  user_ref_id: number;
  trang_thai_id: number;
  created_at: Date;
  updated_at: Date;
}

export async function loginService(
  username: string,
  password: string,
  userAgent?: string,
  ipAddress?: string
) {
  // 1. Lấy user từ DB theo username
  const [rows] = await pool.query<DbUser[]>(
    `
    SELECT 
      id,
      username,
      password_hash,
      email,
      role_id,
      user_type_id,
      user_ref_id,
      trang_thai_id,
      created_at,
      updated_at
    FROM users
    WHERE username = ?
    LIMIT 1
    `,
    [username]
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];

  // 2. So sánh mật khẩu
  console.log(password)
  console.log(user.password_hash)
  const ok = await bcrypt.compare(password, user.password_hash.trim());
  console.log(ok)
  if (!ok) {
    return null;
  }

  // 3. Tạo access token (2h)
  const accessToken = jwt.sign(
    {
      userId: user.id,
      roleId: user.role_id,
      userTypeId: user.user_type_id,
      userRefId: user.user_ref_id
    },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: '2h' }
  );

  // 4. Tạo refresh token (7 ngày)
  const refreshToken = jwt.sign(
    { userId: user.id },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // 5. Hash refresh token để lưu DB (CHAR(64))
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // 6. Thời gian hết hạn
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 7. Lưu refresh token vào bảng refresh_tokens
  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO refresh_tokens
      (user_id, token_hash, user_agent, ip_address, expires_at)
    VALUES
      (?, ?, ?, ?, ?)
    `,
    [
      user.id,
      refreshTokenHash,
      userAgent || null,
      ipAddress || null,
      expiresAt
    ]
  );

  const refreshTokenId = result.insertId;

  // 8. Trả về cho controller
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      user_type_id: user.user_type_id,
      user_ref_id: user.user_ref_id,
      trang_thai_id: user.trang_thai_id,
      refresh_token_id: refreshTokenId
    }
  };
}

interface DbUser extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  email: string | null;
  role_id: number;
  user_type_id: number;
  user_ref_id: number;
  trang_thai_id: number;
  created_at: Date;
  updated_at: Date;
}

interface DbRefreshToken extends RowDataPacket {
  id: number;
  user_id: number;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
}


export async function refreshService(
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
) {
  try {
    const payload = jwt.verify(
      refreshToken,
      ENV.JWT_REFRESH_SECRET
    ) as { userId: number; iat: number; exp: number };

    const userId = payload.userId;
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const [rows] = await pool.query<DbRefreshToken[]>(
      `
      SELECT id, user_id, token_hash, user_agent, ip_address, expires_at
      FROM refresh_tokens
      WHERE user_id = ? 
        AND token_hash = ?
        AND expires_at > NOW()
      LIMIT 1
      `,
      [userId, tokenHash]
    );

    if (rows.length === 0) {
      return null;
    }

    const rt = rows[0];


    const [userRows] = await pool.query<DbUser[]>(
      `
      SELECT 
        id,
        username,
        email,
        role_id,
        user_type_id,
        user_ref_id,
        trang_thai_id
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [rt.user_id]
    );

    if (userRows.length === 0) {
      return null;
    }

    const user = userRows[0];

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        roleId: user.role_id,
        userTypeId: user.user_type_id,
        userRefId: user.user_ref_id
      },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await pool.query<ResultSetHeader>(
      `
      UPDATE refresh_tokens
      SET token_hash = ?, user_agent = ?, ip_address = ?, expires_at = ?
      WHERE id = ?
      `,
      [
        newRefreshTokenHash,
        userAgent || null,
        ipAddress || null,
        newExpiresAt,
        rt.id
      ]
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        user_type_id: user.user_type_id,
        user_ref_id: user.user_ref_id,
        trang_thai_id: user.trang_thai_id
      }
    };
  } catch (err) {
    console.error('refreshService error:', err);
    return null;
  }
}


export async function logoutService(refreshToken: string) {
  if (!refreshToken) return;

  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');


  await pool.query<ResultSetHeader>(
    `
    DELETE FROM refresh_tokens
    WHERE token_hash = ?
    `,
    [tokenHash]
  );
}



//tạo tk
interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
  role_id?: number;
  user_type_id?: number;
  user_ref_id?: number | null;
}

export async function registerService(input: CreateUserInput) {
  const {
    username,
    password,
    email,
    role_id = 1,        // ví dụ: 1 = ADMIN, 2 = USER
    user_type_id = 1,   // tùy bạn quy ước
    user_ref_id = 1,
    
  } = input;

  // 1. Kiểm tra trùng username hoặc email
  const [existRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id, username, email
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
    `,
    [username, email || null]
  );

  if (existRows.length > 0) {
    const exist = existRows[0];
    if (exist.username === username) {
      throw new Error('USERNAME_EXISTS');
    }
    if (email && exist.email === email) {
      throw new Error('EMAIL_EXISTS');
    }
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Insert user vào bảng users
  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO users
      (username, password_hash, email, role_id, user_type_id, user_ref_id, trang_thai_id, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      username,
      passwordHash,
      email || null,
      role_id,
      user_type_id,
      user_ref_id,
      1 // trang_thai_id = 1 (active)
    ]
  );

  const newUserId = result.insertId;

  // 4. Lấy lại user vừa tạo (nếu muốn trả về)
  const [rows] = await pool.query<DbUser[]>(
    `
    SELECT
      id,
      username,
      email,
      role_id,
      user_type_id,
      user_ref_id,
      trang_thai_id,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
    `,
    [newUserId]
  );

  const user = rows[0];

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role_id: user.role_id,
    user_type_id: user.user_type_id,
    user_ref_id: user.user_ref_id,
    trang_thai_id: user.trang_thai_id,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

// danh sách chung

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

interface FkRow extends RowDataPacket {
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

function pickDisplayColumn(
  cols: ColumnRow[],
  referencedColumn: string
): string | null {
  const stringCols = cols.filter(c =>
    ['char', 'varchar', 'text', 'mediumtext', 'longtext'].includes(
      c.DATA_TYPE.toLowerCase()
    )
  );

  if (stringCols.length === 0) return null;

  let candidate =
    stringCols.find(c => c.COLUMN_NAME.toLowerCase().startsWith('ten_')) ||
    stringCols.find(c => c.COLUMN_NAME.toLowerCase().includes('name'));

  if (candidate) return candidate.COLUMN_NAME;

  candidate = stringCols.find(
    c =>
      c.COLUMN_NAME.toLowerCase() !== referencedColumn.toLowerCase() &&
      !c.COLUMN_NAME.toLowerCase().includes('id')
  );
  if (candidate) return candidate.COLUMN_NAME;

  return stringCols[0].COLUMN_NAME;
}
export async function selectWithFkRealText(tableName: string) {
  const dbName = ENV.DB_NAME;
  const [columns] = await pool.query<ColumnRow[]>(
    `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
    `,
    [dbName, tableName]
  );
  if (columns.length === 0) {
    throw new Error(`Table ${tableName} not found in database ${dbName}`);
  }
  const [fkRows] = await pool.query<FkRow[]>(
    `
    SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    [dbName, tableName]
  );


  const fkMap = new Map<
    string,
    { refTable: string; refColumn: string; displayColumn: string | null; alias: string }
  >();
  let aliasIndex = 1;
  for (const fk of fkRows) {
    const colName = fk.COLUMN_NAME;
    const refTable = fk.REFERENCED_TABLE_NAME;
    const refColumn = fk.REFERENCED_COLUMN_NAME;

    const [refCols] = await pool.query<ColumnRow[]>(
      `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
      `,
      [dbName, refTable]
    );

    const displayColumn = pickDisplayColumn(refCols, refColumn);
    const alias = `fk_${aliasIndex++}`; 

    fkMap.set(colName, {
      refTable,
      refColumn,
      displayColumn,
      alias
    });
  }


  const selectParts: string[] = [];

  for (const col of columns) {
    const colName = col.COLUMN_NAME;

    selectParts.push(`t.\`${colName}\``);

    const fkInfo = fkMap.get(colName);
    if (fkInfo && fkInfo.displayColumn) {
      selectParts.push(
        `${fkInfo.alias}.\`${fkInfo.displayColumn}\` AS \`${colName}_text\``
      );
    } else if (fkInfo && !fkInfo.displayColumn) {
      selectParts.push(`NULL AS \`${colName}_text\``);
    }
  }

  const joinParts: string[] = [];

  for (const [colName, fkInfo] of fkMap.entries()) {
    const { refTable, refColumn, alias } = fkInfo;

    joinParts.push(
      `LEFT JOIN \`${refTable}\` AS ${alias} ON ${alias}.\`${refColumn}\` = t.\`${colName}\``
    );
  }

  const sql = `
    SELECT
      ${selectParts.join(',\n      ')}
    FROM \`${tableName}\` AS t
    ${joinParts.length ? '\n' + joinParts.join('\n') : ''}
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql);
  return rows;
}