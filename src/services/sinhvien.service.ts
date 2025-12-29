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
  khoa_hoc?: number | null;
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
  return w.startsWith("http://") || w.startsWith("https://") ? w : `https://${w}`;
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
    [id],
  );
  const list = rows as unknown as SinhVien[];
  return list[0] || null;
}

export async function createSinhVien(payload: {
  ma_sv: string;
  ho_ten: string;
  email?: string | null;
  sdt?: string | null;
  khoa_id?: number | null;
  lop_nien_che?: string | null;
  khoa_hoc?: number | null;
  gioi_tinh_id?: number | null;
  ngay_sinh?: string | null; // 'YYYY-MM-DD'
  user?: string | null;
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
      khoa_hoc = null,
      gioi_tinh_id = null,
      ngay_sinh = null,
      user = null,
    } = payload;

    if (!email) {
      throw new Error(
        "Email sinh viên không được để trống (cần để gửi thông tin tài khoản).",
      );
    }

    // 1) Insert sinh_vien
    const [svResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO sinh_vien 
        (ma_sv, ho_ten, email, sdt, khoa_id, lop_nien_che, khoa_hoc, gioi_tinh_id, ngay_sinh, trang_thai_id, created_at, updated_at, \`user\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), ?)`,
      [
        ma_sv,
        ho_ten,
        email,
        sdt,
        khoa_id,
        lop_nien_che,
        khoa_hoc,
        gioi_tinh_id,
        ngay_sinh,
        user,
      ],
    );

    const sinhVienId = svResult.insertId;
    if (!sinhVienId) {
      throw new Error("Insert sinh_vien failed: insertId is undefined");
    }

    // 2) Tạo tài khoản user
    const plainPassword = generatePassword(10);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // TODO: đổi theo hệ của bạn
    // bảng users của bạn có user_type_id NOT NULL => cần set đúng
    const USER_TYPE_ID_STUDENT = 1;

    // Nếu tên bảng user của bạn KHÔNG phải "users" thì đổi lại tại đây
    await conn.query<ResultSetHeader>(
      `INSERT INTO users
        (username, password_hash, email, role_id, user_type_id, user_ref_id, trang_thai_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [ma_sv, passwordHash, email, 3, USER_TYPE_ID_STUDENT, sinhVienId],
    );

    await conn.commit();

    // 3) Gửi email sau commit (tránh rollback làm lệch trạng thái)
    await sendStudentWelcomeEmail({
      to: email,
      username: ma_sv,
      password: plainPassword,
    });

    const newRecord = await getSinhVienById(sinhVienId);
    if (!newRecord) {
      throw new Error(
        "Insert sinh_vien succeeded but getSinhVienById returned null",
      );
    }

    return newRecord;
  } catch (err) {
    await conn.rollback();
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
    khoa_hoc?: number | null;
    gioi_tinh_id?: number | null;
    ngay_sinh?: string | null;
    trang_thai_id?: number | null;
    user?: string | null;
  },
): Promise<SinhVien | null> {
  const {
    ma_sv,
    ho_ten,
    email = null,
    sdt = null,
    khoa_id = null,
    lop_nien_che = null,
    khoa_hoc = null,
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
        khoa_hoc = ?,
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
      khoa_hoc,
      gioi_tinh_id,
      ngay_sinh,
      trang_thai_id,
      user,
      id,
    ],
  );

  const updated = await getSinhVienById(id);
  return updated;
}

export async function deleteSinhVien(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE sinh_vien 
       SET trang_thai_id = 2, updated_at = NOW()
     WHERE id = ?`,
    [id],
  );

  return result.affectedRows > 0;
}
