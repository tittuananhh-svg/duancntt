import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

export type LopHocPhanGVItem = {
  ma_lop_hp: string;

  hoc_ky: string | number | null;
  nam_hoc: string | number | null;

  ma_mon: string;
  ten_mon: string;
  so_tin_chi: number;
  so_tiet_ly_thuyet: number;
  so_tiet_thuc_hanh: number;

  si_so_thuc_te: number;

  ma_phong: string | null;
  toa_nha: string | null;
};

export async function getDanhSachLopHocPhanCuaGiangVienByUserId(
  userId: number,
): Promise<LopHocPhanGVItem[]> {
  const sql = `
    SELECT
      lhp.ma_lop_hp, lhp.id,

      kh.hoc_ky,
      kh.nam_hoc,

      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi,
      mh.so_tiet_ly_thuyet,
      mh.so_tiet_thuc_hanh,

      IFNULL(lhp.si_so_thuc_te, 0) AS si_so_thuc_te,

      p.ma_phong,
      p.toa_nha
    FROM lop_hoc_phan lhp
    JOIN giang_vien gv ON gv.id = lhp.giang_vien_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    JOIN ky_hoc kh ON kh.id = lhp.ky_hoc_id
    LEFT JOIN phong_hoc p ON p.id = lhp.phong_id
    WHERE gv.user = ?
    ORDER BY kh.nam_hoc DESC, kh.hoc_ky DESC, lhp.ma_lop_hp ASC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);

  return (rows as any[]).map((r) => ({
    ma_lop_hp_id: String(r.id),
    ma_lop_hp: String(r.ma_lop_hp),

    hoc_ky: r.hoc_ky ?? null,
    nam_hoc: r.nam_hoc ?? null,

    ma_mon: String(r.ma_mon),
    ten_mon: String(r.ten_mon),
    so_tin_chi: Number(r.so_tin_chi),
    so_tiet_ly_thuyet: Number(r.so_tiet_ly_thuyet),
    so_tiet_thuc_hanh: Number(r.so_tiet_thuc_hanh),

    si_so_thuc_te: Number(r.si_so_thuc_te ?? 0),

    ma_phong: r.ma_phong != null ? String(r.ma_phong) : null,
    toa_nha: r.toa_nha != null ? String(r.toa_nha) : null,
  }));
}

export type SinhVienTrongLHPItem = {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;

  ngay_dang_ky: string | null;
  trang_thai_id: number | null;
  ghi_chu: string | null;

  diem_qua_trinh: number | null;
  diem_thi: number | null;
  diem_tong: number | null;
  xep_loai_id: number | null;
};

export async function getAllSinhVienTrongLopHocPhan(params: {
  lop_hoc_phan_id: number;
}): Promise<SinhVienTrongLHPItem[]> {
  const { lop_hoc_phan_id } = params;

  const sql = `
    SELECT
      sv.id AS sinh_vien_id,
      sv.ma_sv,
      sv.ho_ten,
      sv.email,
      sv.sdt,

      dklhp.ngay_dang_ky,
      dklhp.trang_thai_id,
      dklhp.ghi_chu,

      kq.diem_qua_trinh,
      kq.diem_thi,
      kq.diem_tong,
      kq.xep_loai_id
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    LEFT JOIN ket_qua_hoc_tap kq
      ON kq.sinh_vien_id = dklhp.sinh_vien_id
     AND kq.lop_hoc_phan_id = dklhp.lop_hoc_phan_id
    WHERE dklhp.lop_hoc_phan_id = ?
    ORDER BY sv.id ASC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [lop_hoc_phan_id]);

  return (rows as any[]).map((r) => ({
    sinh_vien_id: Number(r.sinh_vien_id),
    ma_sv: String(r.ma_sv),
    ho_ten: String(r.ho_ten),
    email: r.email != null ? String(r.email) : null,
    sdt: r.sdt != null ? String(r.sdt) : null,

    ngay_dang_ky: r.ngay_dang_ky != null ? String(r.ngay_dang_ky) : null,
    trang_thai_id: r.trang_thai_id != null ? Number(r.trang_thai_id) : null,
    ghi_chu: r.ghi_chu != null ? String(r.ghi_chu) : null,

    diem_qua_trinh: r.diem_qua_trinh != null ? Number(r.diem_qua_trinh) : null,
    diem_thi: r.diem_thi != null ? Number(r.diem_thi) : null,
    diem_tong: r.diem_tong != null ? Number(r.diem_tong) : null,
    xep_loai_id: r.xep_loai_id != null ? Number(r.xep_loai_id) : null,
  }));
}
