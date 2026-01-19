import { pool } from "../config/database";

function normalizeIds(input: any): number[] {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");
  const ids = arr
    .map((x) => Number(String(x).trim()))
    .filter((x) => Number.isFinite(x) && x > 0);
  return Array.from(new Set(ids));
}

export async function getSinhVienDaDangKyTrongKy(params: {
  ky_hoc_id: number;
  mon_hoc_ids?: number[]; // optional
}) {
  const ky_hoc_id = Number(params.ky_hoc_id);
  const monIds = normalizeIds(params.mon_hoc_ids);

  let whereMon = "";
  const sqlParams: any[] = [ky_hoc_id];

  if (monIds.length) {
    whereMon = ` AND lhp.mon_hoc_id IN (${monIds.map(() => "?").join(",")}) `;
    sqlParams.push(...monIds);
  }

  const [rows] = await pool.execute<any[]>(
    `
    SELECT
      sv.ma_sv      AS ma_sv,
      sv.ho_ten     AS ho_ten,
      lhp.ma_lop_hp AS ma_lop_hp,
      mh.ma_mon     AS ma_mon,
      mh.ten_mon    AS ten_mon,
      mh.so_tin_chi AS so_tin_chi
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    WHERE lhp.ky_hoc_id = ?
    ${whereMon}
    ORDER BY sv.id ASC, mh.ma_mon ASC, lhp.ma_lop_hp ASC
    `,
    sqlParams,
  );

  return rows;
}
