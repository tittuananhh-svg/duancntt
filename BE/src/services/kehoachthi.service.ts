import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/database";

export type KeHoachThiRow = {
  id: number;
  ky_hoc_id: number;
  mon_hoc_id: number;
  mo_ta: string | null;
  ngay_bat_dau: string | null; // YYYY-MM-DD
  ngay_ket_thuc: string | null; // YYYY-MM-DD
  trang_thai_id: number;
  created_at: string;
  updated_at: string;
};

export async function listKeHoachThi(params?: {
  ky_hoc_id?: number;
  mon_hoc_id?: number;
  trang_thai_id?: number;
}) {
  const where: string[] = [];
  const values: any[] = [];

  if (params?.ky_hoc_id != null) {
    where.push("kht.ky_hoc_id = ?");
    values.push(params.ky_hoc_id);
  }
  if (params?.mon_hoc_id != null) {
    where.push("kht.mon_hoc_id = ?");
    values.push(params.mon_hoc_id);
  }
  if (params?.trang_thai_id != null) {
    where.push("kht.trang_thai_id = ?");
    values.push(params.trang_thai_id);
  }

  const sql = `
    SELECT
      kht.id,
      kht.ky_hoc_id,
      kht.mon_hoc_id,
      kht.mo_ta,
      DATE_FORMAT(kht.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
      DATE_FORMAT(kht.ngay_ket_thuc, '%Y-%m-%d') AS ngay_ket_thuc,
      kht.trang_thai_id,
      kht.created_at,
      kht.updated_at
    FROM ke_hoach_thi kht
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY kht.id DESC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, values);
  return rows as unknown as KeHoachThiRow[];
}

export async function createKeHoachThi(params: {
  ky_hoc_id: number;
  mon_hoc_id: number;
  mo_ta?: string;
  ngay_bat_dau?: string; // YYYY-MM-DD
  ngay_ket_thuc?: string; // YYYY-MM-DD
}) {
  const { ky_hoc_id, mon_hoc_id } = params;
  const mo_ta = params.mo_ta ?? null;
  const ngay_bat_dau = params.ngay_bat_dau ?? null;
  const ngay_ket_thuc = params.ngay_ket_thuc ?? null;

  const sql = `
    INSERT INTO ke_hoach_thi
      (ky_hoc_id, mon_hoc_id, mo_ta, ngay_bat_dau, ngay_ket_thuc, trang_thai_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
  `;

  const [rs] = await pool.query<ResultSetHeader>(sql, [
    ky_hoc_id,
    mon_hoc_id,
    mo_ta,
    ngay_bat_dau,
    ngay_ket_thuc,
  ]);

  return { id: rs.insertId, ky_hoc_id, mon_hoc_id, trang_thai_id: 1 };
}

export async function updateKeHoachThi(params: {
  id: number;
  ky_hoc_id?: number;
  mon_hoc_id?: number;
  mo_ta?: string | null;
  ngay_bat_dau?: string | null;
  ngay_ket_thuc?: string | null;
  trang_thai_id?: number;
}) {
  const { id } = params;

  const fields: string[] = [];
  const values: any[] = [];

  if (params.ky_hoc_id != null) {
    fields.push("ky_hoc_id = ?");
    values.push(params.ky_hoc_id);
  }
  if (params.mon_hoc_id != null) {
    fields.push("mon_hoc_id = ?");
    values.push(params.mon_hoc_id);
  }
  if (params.mo_ta !== undefined) {
    fields.push("mo_ta = ?");
    values.push(params.mo_ta);
  }
  if (params.ngay_bat_dau !== undefined) {
    fields.push("ngay_bat_dau = ?");
    values.push(params.ngay_bat_dau);
  }
  if (params.ngay_ket_thuc !== undefined) {
    fields.push("ngay_ket_thuc = ?");
    values.push(params.ngay_ket_thuc);
  }
  if (params.trang_thai_id != null) {
    fields.push("trang_thai_id = ?");
    values.push(params.trang_thai_id);
  }

  if (!fields.length) return { id, updated: 0 };

  const sql = `
    UPDATE ke_hoach_thi
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = ?
  `;
  values.push(id);

  const [rs] = await pool.query<ResultSetHeader>(sql, values);

  return { id, updated: rs.affectedRows };
}
