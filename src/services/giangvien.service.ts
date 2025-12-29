import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';

export interface GiangVien {
  id?: number;
  ma_gv: string;
  ho_ten: string;
  email?: string | null;
  sdt?: string | null;
  khoa_id?: number | null;
  gioi_tinh_id?: number | null;
  ngay_sinh?: string | Date | null;
  hoc_ham?: string | null;
  hoc_vi?: string | null;
  created_at?: Date;
  updated_at?: Date;
  user?: string | null;
}

export async function searchGiangVien(q: string): Promise<GiangVien[]> {
  let sql = `SELECT * FROM giang_vien`;
  const params: any[] = [];

  if (q && q.trim() !== "") {
    sql += ` WHERE (ma_gv LIKE ? OR ho_ten LIKE ? OR email LIKE ? OR sdt LIKE ?)`;
    const s = `%${q}%`;
    params.push(s, s, s, s);
  }

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as GiangVien[];
}


export async function getGiangVienById(id: number): Promise<GiangVien | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM giang_vien WHERE id = ?",
    [id]
  );

  const list = rows as unknown as GiangVien[];
  return list[0] || null;
}


export async function createGiangVien(payload: {
  ma_gv: string;
  ho_ten: string;
  email?: string | null;
  sdt?: string | null;
  khoa_id?: number | null;
  gioi_tinh_id?: number | null;
  ngay_sinh?: string | null;
  hoc_ham?: string | null;
  hoc_vi?: string | null;
  user?: string | null;
}): Promise<GiangVien> {

  const {
    ma_gv,
    ho_ten,
    email = null,
    sdt = null,
    khoa_id = null,
    gioi_tinh_id = null,
    ngay_sinh = null,
    hoc_ham = null,
    hoc_vi = null,
    user = null,
  } = payload;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO giang_vien 
      (ma_gv, ho_ten, email, sdt, khoa_id, gioi_tinh_id, ngay_sinh, hoc_ham, hoc_vi, created_at, updated_at, \`user\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
    [
      ma_gv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      gioi_tinh_id,
      ngay_sinh,
      hoc_ham,
      hoc_vi,
      user,
    ]
  );

  const insertId = (result as ResultSetHeader).insertId;

  if (!insertId) throw new Error("Insert giang_vien failed!");

  const newRecord = await getGiangVienById(insertId);
  if (!newRecord) throw new Error("Insert succeeded but cannot fetch new record!");

  return newRecord;
}


export async function updateGiangVien(
  id: number,
  payload: {
    ma_gv: string;
    ho_ten: string;
    email?: string | null;
    sdt?: string | null;
    khoa_id?: number | null;
    gioi_tinh_id?: number | null;
    ngay_sinh?: string | null;
    hoc_ham?: string | null;
    hoc_vi?: string | null;
    user?: string | null;
  }
): Promise<GiangVien | null> {
  const {
    ma_gv,
    ho_ten,
    email = null,
    sdt = null,
    khoa_id = null,
    gioi_tinh_id = null,
    ngay_sinh = null,
    hoc_ham = null,
    hoc_vi = null,
    user = null,
  } = payload;

  await pool.query<ResultSetHeader>(
    `UPDATE giang_vien SET
      ma_gv = ?,
      ho_ten = ?,
      email = ?,
      sdt = ?,
      khoa_id = ?,
      gioi_tinh_id = ?,
      ngay_sinh = ?,
      hoc_ham = ?,
      hoc_vi = ?,
      \`user\` = ?,
      updated_at = NOW()
     WHERE id = ?`,
    [
      ma_gv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      gioi_tinh_id,
      ngay_sinh,
      hoc_ham,
      hoc_vi,
      user,
      id,
    ]
  );

  return await getGiangVienById(id);
}


export async function deleteGiangVien(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM giang_vien WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
}
