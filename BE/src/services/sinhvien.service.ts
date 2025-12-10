import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';

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


export async function searchSinhVien(q: string): Promise<SinhVien[]> {
  let sql = `SELECT * FROM sinh_vien WHERE trang_thai_id != 2`;
  const params: any[] = [];

  if (q && q.trim() !== '') {
    sql += ` AND (ma_sv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR sdt LIKE ?)`;
    const s = `%${q}%`;
    params.push(s, s, s, s);
  }

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as SinhVien[];
}


export async function getSinhVienById(id: number): Promise<SinhVien | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM sinh_vien WHERE id = ?',
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

  const [result] = await pool.query<ResultSetHeader>(
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

  const insertId = result.insertId;
  if (!insertId) {
    throw new Error('Insert sinh_vien failed: insertId is undefined');
  }

  const newRecord = await getSinhVienById(insertId);
  if (!newRecord) {
    throw new Error(
      'Insert sinh_vien succeeded but getSinhVienById returned null',
    );
  }

  return newRecord;
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
