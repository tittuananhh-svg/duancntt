import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/database';

export interface MonHoc {
  id?: number;
  ma_mon: string;
  ten_mon: string;
  so_tin_chi: number;
  so_tiet_ly_thuyet?: number | null;
  so_tiet_thuc_hanh?: number | null;
  created_at?: Date;
  updated_at?: Date;
  trang_thai?: number; // 1 = hoạt động, 2 = đóng
}


export async function searchMonHoc(q: string): Promise<MonHoc[]> {
  let sql = `SELECT * FROM mon_hoc WHERE trang_thai != 2`;
  const params: any[] = [];

  if (q && q.trim() !== '') {
    sql += ` AND (ma_mon LIKE ? OR ten_mon LIKE ?)`;
    const s = `%${q}%`;
    params.push(s, s);
  }

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as MonHoc[];
}

export async function getMonHocById(id: number): Promise<MonHoc | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM mon_hoc WHERE id = ?',
    [id],
  );
  const list = rows as unknown as MonHoc[];
  return list[0] || null;
}


export async function createMonHoc(payload: {
  ma_mon: string;
  ten_mon: string;
  so_tin_chi: number;
  so_tiet_ly_thuyet?: number | null;
  so_tiet_thuc_hanh?: number | null;
  bat_buoc?: number | 1;
  cap_do_uu_tien?: number | 1;
}): Promise<MonHoc> {
  const {
    ma_mon,
    ten_mon,
    so_tin_chi,
    so_tiet_ly_thuyet = null,
    so_tiet_thuc_hanh = null,
    bat_buoc,
    cap_do_uu_tien
  } = payload;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO mon_hoc 
      (ma_mon, ten_mon, so_tin_chi, so_tiet_ly_thuyet, so_tiet_thuc_hanh, trang_thai, created_at, updated_at, bat_buoc, cap_do_uu_tien)
     VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW(), ?, ?)`,
    [ma_mon, ten_mon, so_tin_chi, so_tiet_ly_thuyet, so_tiet_thuc_hanh, bat_buoc, cap_do_uu_tien],
  );

  const insertId = result.insertId;

  if (!insertId) {
    throw new Error('Insert mon_hoc failed: insertId is undefined');
  }

  const newRecord = await getMonHocById(insertId);
  if (!newRecord) {
    throw new Error('Insert mon_hoc succeeded but getMonHocById returned null');
  }

  return newRecord;
}


export async function updateMonHoc(
  id: number,
  payload: {
    ma_mon: string;
    ten_mon: string;
    so_tin_chi: number;
    so_tiet_ly_thuyet?: number | null;
    so_tiet_thuc_hanh?: number | null;
    trang_thai?: number;
  },
): Promise<MonHoc | null> {
  const {
    ma_mon,
    ten_mon,
    so_tin_chi,
    so_tiet_ly_thuyet = null,
    so_tiet_thuc_hanh = null,
    trang_thai = 1,
  } = payload;

  await pool.query<ResultSetHeader>(
    `UPDATE mon_hoc SET
        ma_mon = ?,
        ten_mon = ?,
        so_tin_chi = ?,
        so_tiet_ly_thuyet = ?,
        so_tiet_thuc_hanh = ?,
        trang_thai = ?,
        updated_at = NOW()
     WHERE id = ?`,
    [
      ma_mon,
      ten_mon,
      so_tin_chi,
      so_tiet_ly_thuyet,
      so_tiet_thuc_hanh,
      trang_thai,
      id,
    ],
  );

  const updated = await getMonHocById(id);
  return updated;
}

export async function deleteMonHoc(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE mon_hoc 
       SET trang_thai = 2, updated_at = NOW()
     WHERE id = ?`,
    [id],
  );

  return result.affectedRows > 0;
}
