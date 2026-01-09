import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/database";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import crypto from "crypto";

export interface SinhVien {
  id?: number;
  ma_sv: string;
  ho_ten: string;
  email?: string | null;
  sdt?: string | null;
  khoa_id?: number | null;
  lop_nien_che?: string | null;
  gioi_tinh_id?: number | null;
  ngay_sinh?: string | Date | null;
  trang_thai_id?: number;
  created_at?: Date;
  updated_at?: Date;
  user?: string | null;
}

/** ====== EMAIL SETUP (Gmail App Password) ====== */
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

function normalizeWebUrl(web?: string) {
  const w = (web || "").trim();
  if (!w) return "";
  return w.startsWith("http://") || w.startsWith("https://")
    ? w
    : `https://${w}`;
}

async function sendStudentWelcomeEmail(opts: {
  to: string;
  username: string;
  password: string;
}) {
  const loginUrl = normalizeWebUrl(process.env.WEB);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Thông báo nhập học thành công</h2>
      <p>Chúc mừng bạn đã nhập học thành công.</p>

      <p><b>Thông tin tài khoản:</b></p>
      <ul>
        <li>Username: <b>${opts.username}</b></li>
        <li>Mật khẩu: <b>${opts.password}</b></li>
      </ul>

      ${
        loginUrl
          ? `<p>Link đăng nhập: <a href="${loginUrl}">${loginUrl}</a></p>`
          : `<p>Link đăng nhập: (chưa cấu hình biến WEB)</p>`
      }

      <p><i>Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</i></p>
    </div>
  `;

  await mailer.sendMail({
    from: `"Web Quản Lý Đại Học" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: "Nhập học thành công - Thông tin tài khoản",
    html,
  });
}

function generatePassword(length = 10) {
  // random password, chỉ gồm chữ+số cho dễ copy
  return crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
}

/** ====== CRUD SINH_VIEN ====== */
export async function searchSinhVien(q: string): Promise<SinhVien[]> {
  let sql = `SELECT * FROM sinh_vien WHERE trang_thai_id != 2`;
  const params: any[] = [];

  if (q && q.trim() !== "") {
    sql += ` AND (ma_sv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR sdt LIKE ?)`;
    const s = `%${q}%`;
    params.push(s, s, s, s);
  }

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as SinhVien[];
}

export async function getSinhVienById(id: number): Promise<SinhVien | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM sinh_vien WHERE id = ?",
    [id]
  );
  const list = rows as unknown as SinhVien[];
  return list[0] || null;
}

function isMysqlDup(err: any) {
  return err?.code === "ER_DUP_ENTRY" || err?.errno === 1062;
}

function getDupFieldFromMsg(sqlMessage?: string) {
  // ví dụ: "Duplicate entry 'abc@gmail.com' for key 'email'"
  // hoặc:  "... for key 'users.email'" tuỳ MySQL
  const m = sqlMessage?.match(/for key '([^']+)'/);
  const key = m?.[1] || "";
  // key có thể là email / username / users.email / uniq_users_email ...
  if (key.includes("email")) return "email";
  if (key.includes("username")) return "username";
  return "unknown";
}

export async function createSinhVien(payload: {
  ma_sv: string;
  ho_ten: string;
  email?: string | null;
  sdt?: string | null;
  khoa_id?: number | null;
  lop_nien_che?: string | null;
  gioi_tinh_id?: number | null;
  ngay_sinh?: string | null;
}): Promise<SinhVien> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      ma_sv,
      ho_ten,
      email = null,
      sdt = null,
      khoa_id = null,
      lop_nien_che = null,
      gioi_tinh_id = null,
      ngay_sinh = null,
    } = payload;

    if (!email) {
      const e: any = new Error("EMAIL_REQUIRED");
      throw e;
    }

    // (khuyến nghị) check sớm ở mức app để message chuẩn + tránh rollback tốn
    const [checkUser] = await conn.query<any[]>(
      `SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [ma_sv, email]
    );
    if (Array.isArray(checkUser) && checkUser.length > 0) {
      const existed = checkUser[0];
      if (existed.username === ma_sv) throw new Error("USERNAME_EXISTS");
      if (existed.email === email) throw new Error("EMAIL_EXISTS");
      throw new Error("USER_EXISTS");
    }

    // ====== INSERT SINH_VIEN / USERS theo flow bạn đang dùng ======
    // Lưu ý: đoạn này tuỳ bạn đang theo hướng nào (placeholder hay nullable)
    // Ở đây minh hoạ insert USERS trước với user_ref_id NULL (nếu đã cho NULL)
    const plainPassword = generatePassword(10);
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const USER_TYPE_ID_STUDENT = 1;

    const [userResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO users
        (username, password_hash, email, role_id, user_type_id, user_ref_id,
         trang_thai_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, 1, NOW(), NOW())`,
      [ma_sv, passwordHash, email, 3, USER_TYPE_ID_STUDENT]
    );

    const userId = userResult.insertId;
    if (!userId) throw new Error("INSERT_USERS_FAILED");

    const [svResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO sinh_vien 
        (ma_sv, ho_ten, email, sdt, khoa_id, lop_nien_che, gioi_tinh_id, ngay_sinh,
         trang_thai_id, created_at, updated_at, \`user\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
      [
        ma_sv,
        ho_ten,
        email,
        sdt,
        khoa_id,
        lop_nien_che,
        gioi_tinh_id,
        ngay_sinh,
        userId,
      ]
    );

    const sinhVienId = svResult.insertId;
    if (!sinhVienId) throw new Error("INSERT_SINHVIEN_FAILED");

    await conn.query(`UPDATE users SET user_ref_id = ? WHERE id = ?`, [
      sinhVienId,
      userId,
    ]);

    await conn.commit();

    // gửi mail sau commit
    try {
      await sendStudentWelcomeEmail({
        to: email,
        username: ma_sv,
        password: plainPassword,
      });
    } catch (e) {
      console.error("Send email failed:", e);
    }

    const newRecord = await getSinhVienById(sinhVienId);
    if (!newRecord) throw new Error("FETCH_AFTER_CREATE_FAILED");

    return newRecord;
  } catch (err: any) {
    await conn.rollback();

    // map lỗi DB duplicate thành lỗi nghiệp vụ
    if (isMysqlDup(err)) {
      const field = getDupFieldFromMsg(err?.sqlMessage);
      if (field === "email") throw new Error("EMAIL_EXISTS");
      if (field === "username") throw new Error("USERNAME_EXISTS");
      throw new Error("DUPLICATE_ENTRY");
    }

    throw err;
  } finally {
    conn.release();
  }
}

export async function updateSinhVien(
  id: number,
  payload: {
    ma_sv: string;
    ho_ten: string;
    email?: string | null;
    sdt?: string | null;
    khoa_id?: number | null;
    lop_nien_che?: string | null;
    gioi_tinh_id?: number | null;
    ngay_sinh?: string | null;
    trang_thai_id?: number | null;
    user?: string | null;
  }
): Promise<SinhVien | null> {
  const {
    ma_sv,
    ho_ten,
    email = null,
    sdt = null,
    khoa_id = null,
    lop_nien_che = null,
    gioi_tinh_id = null,
    ngay_sinh = null,
    trang_thai_id = 1,
    user = null,
  } = payload;

  await pool.query<ResultSetHeader>(
    `UPDATE sinh_vien SET
        ma_sv = ?,
        ho_ten = ?,
        email = ?,
        sdt = ?,
        khoa_id = ?,
        lop_nien_che = ?,
        gioi_tinh_id = ?,
        ngay_sinh = ?,
        trang_thai_id = ?,
        \`user\` = ?,
        updated_at = NOW()
     WHERE id = ?`,
    [
      ma_sv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      lop_nien_che,
      gioi_tinh_id,
      ngay_sinh,
      trang_thai_id,
      user,
      id,
    ]
  );

  const updated = await getSinhVienById(id);
  return updated;
}

export async function deleteSinhVien(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE sinh_vien 
       SET trang_thai_id = 2, updated_at = NOW()
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}
