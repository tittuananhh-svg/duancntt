import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

export type ThoiKhoaBieuRow = {
  ma_lop_hp: string;
  ma_mon: string;
  ten_mon: string;
  thu_trong_tuan: number;
  ca_bat_dau_id: number;
  ca_ket_thuc_id: number;
};

export async function getThoiKhoaBieuSinhVien(params: {
  ky_hoc_id: number;
  sinh_vien_id: number;
}) {
  const { ky_hoc_id, sinh_vien_id } = params;

  const sql = `
    SELECT
      lhp.ma_lop_hp,
      mh.ma_mon,
      mh.ten_mon,
      tgh.thu_trong_tuan,
      tgh.ca_bat_dau_id,
      tgh.ca_ket_thuc_id
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    JOIN thoigianhoc_lophocphan tgh ON tgh.ma_lop_hp = lhp.ma_lop_hp
    WHERE dklhp.sinh_vien_id = ?
      AND lhp.ky_hoc_id = ?
    ORDER BY
      tgh.thu_trong_tuan ASC,
      tgh.ca_bat_dau_id ASC,
      lhp.id ASC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [
    sinh_vien_id,
    ky_hoc_id,
  ]);

  return (rows as any[]).map((r) => ({
    ma_lop_hp: String(r.ma_lop_hp),
    ma_mon: String(r.ma_mon),
    ten_mon: String(r.ten_mon),
    thu_trong_tuan: Number(r.thu_trong_tuan),
    ca_bat_dau_id: Number(r.ca_bat_dau_id),
    ca_ket_thuc_id: Number(r.ca_ket_thuc_id),
  })) as ThoiKhoaBieuRow[];
}
