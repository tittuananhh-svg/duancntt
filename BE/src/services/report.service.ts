import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

export async function getSinhVienThieuTinChiTrongKy(ky_hoc_id: number) {
  const [cfgRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT so_tin_chi_toi_thieu, trang_thai_id
    FROM cau_hinh_tin_chi_ky_hoc
    WHERE ky_hoc_id = ?
    LIMIT 1
    `,
    [ky_hoc_id],
  );

  if (!cfgRows.length) throw new Error("TIN_CHI_CONFIG_NOT_FOUND");
  const cfg: any = cfgRows[0];
  if (Number(cfg.trang_thai_id) !== 1)
    throw new Error("TIN_CHI_CONFIG_DISABLED");

  const minCredits =
    cfg.so_tin_chi_toi_thieu != null ? Number(cfg.so_tin_chi_toi_thieu) : 0;

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      sv.ma_sv,
      sv.ho_ten,
      k.ma_khoa,
      k.ten_khoa,
      kh.hoc_ky,
      kh.nam_hoc,
      IFNULL(tc.so_tin, 0) AS so_tin_da_dang_ky
    FROM sinh_vien sv
    LEFT JOIN khoa k ON k.id = sv.khoa_id
    LEFT JOIN ky_hoc kh ON kh.id = ?
    LEFT JOIN (
      SELECT t.sinh_vien_id, SUM(mh.so_tin_chi) AS so_tin
      FROM (
        SELECT DISTINCT dklhp.sinh_vien_id, lhp.mon_hoc_id
        FROM dang_ky_lop_hoc_phan dklhp
        JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
        WHERE lhp.ky_hoc_id = ?
      ) t
      JOIN mon_hoc mh ON mh.id = t.mon_hoc_id
      GROUP BY t.sinh_vien_id
    ) tc ON tc.sinh_vien_id = sv.id
    WHERE sv.trang_thai_id = 1
      AND IFNULL(tc.so_tin, 0) < ?
    ORDER BY IFNULL(tc.so_tin, 0) ASC, sv.id ASC
    `,
    [ky_hoc_id, ky_hoc_id, minCredits],
  );

  const data = (rows as any[]).map((r) => ({
    ma_sv: String(r.ma_sv),
    ho_ten: String(r.ho_ten),
    ma_khoa: r.ma_khoa != null ? String(r.ma_khoa) : null,
    ten_khoa: r.ten_khoa != null ? String(r.ten_khoa) : null,
    hoc_ky: r.hoc_ky ?? null,
    nam_hoc: r.nam_hoc ?? null,
    so_tin_da_dang_ky: Number(r.so_tin_da_dang_ky ?? 0),
    so_tin_toi_thieu: minCredits,
  }));

  return { ky_hoc_id, so_tin_toi_thieu: minCredits, total: data.length, data };
}
