import { pool } from "../config/database";

// 1) Bảng điểm theo kỳ (token -> userId -> sinh_vien.user)
export async function getBangDiemSinhVienTrongKy(params: {
  user_id: number; // lấy từ token
  ky_hoc_id: number;
}) {
  const { user_id, ky_hoc_id } = params;

  const [rows] = await pool.execute<any[]>(
    `
    SELECT
      sv.id        AS sinh_vien_id,
      sv.ma_sv     AS ma_sv,
      sv.ho_ten    AS ho_ten,

      kh.hoc_ky    AS hoc_ky,
      kh.nam_hoc   AS nam_hoc,

      lhp.id       AS lop_hoc_phan_id,
      lhp.ma_lop_hp AS ma_lop_hp,

      mh.id        AS mon_hoc_id,
      mh.ma_mon    AS ma_mon,
      mh.ten_mon   AS ten_mon,
      mh.so_tin_chi AS so_tin_chi,

      kq.diem_qua_trinh AS diem_qua_trinh,
      kq.diem_thi       AS diem_thi,
      kq.diem_tong      AS diem_tong,
      kq.xep_loai_id    AS xep_loai_id
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    JOIN ky_hoc kh ON kh.id = lhp.ky_hoc_id
    LEFT JOIN ket_qua_hoc_tap kq
      ON kq.sinh_vien_id = sv.id
     AND kq.lop_hoc_phan_id = lhp.id
    WHERE sv.user = ?
      AND lhp.ky_hoc_id = ?
      AND dklhp.trang_thai_id = 1
    ORDER BY mh.ma_mon ASC, lhp.ma_lop_hp ASC
    `,
    [user_id, ky_hoc_id],
  );

  return rows;
}

// 2) Toàn bộ bảng điểm (tất cả kỳ)
export async function getBangDiemSinhVienToanBo(params: { user_id: number }) {
  const { user_id } = params;

  const [rows] = await pool.execute<any[]>(
    `
    SELECT
      sv.id        AS sinh_vien_id,
      sv.ma_sv     AS ma_sv,
      sv.ho_ten    AS ho_ten,

      kh.id        AS ky_hoc_id,
      kh.hoc_ky    AS hoc_ky,
      kh.nam_hoc   AS nam_hoc,

      lhp.id       AS lop_hoc_phan_id,
      lhp.ma_lop_hp AS ma_lop_hp,

      mh.id        AS mon_hoc_id,
      mh.ma_mon    AS ma_mon,
      mh.ten_mon   AS ten_mon,
      mh.so_tin_chi AS so_tin_chi,

      kq.diem_qua_trinh AS diem_qua_trinh,
      kq.diem_thi       AS diem_thi,
      kq.diem_tong      AS diem_tong,
      kq.xep_loai_id    AS xep_loai_id
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    JOIN ky_hoc kh ON kh.id = lhp.ky_hoc_id
    LEFT JOIN ket_qua_hoc_tap kq
      ON kq.sinh_vien_id = sv.id
     AND kq.lop_hoc_phan_id = lhp.id
    WHERE sv.user = ?
      AND dklhp.trang_thai_id = 1
    ORDER BY kh.nam_hoc DESC, kh.hoc_ky DESC, mh.ma_mon ASC, lhp.ma_lop_hp ASC
    `,
    [user_id],
  );

  return rows;
}
