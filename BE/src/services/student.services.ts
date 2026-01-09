import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

export type TkbSinhVienRow = {
  ma_lop_hp: string;
  ma_mon: string;
  ten_mon: string;
  ma_phong: string;
  toa_nha: string | null;
  thu_trong_tuan: number;
  ca_bat_dau_id: number;
  ca_ket_thuc_id: number;
};

export async function getThoiKhoaBieuSinhVienByUser(params: {
  user_id: number; // users.id lấy từ token
  ky_hoc_id: number;
}) {
  const { user_id, ky_hoc_id } = params;

  const sql = `
    SELECT
      lhp.ma_lop_hp,
      mh.ma_mon,
      mh.ten_mon,
      ph.ma_phong,
      ph.toa_nha,
      tgh.thu_trong_tuan,
      tgh.ca_bat_dau_id,
      tgh.ca_ket_thuc_id
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    JOIN phong_hoc ph ON ph.id = lhp.phong_id
    JOIN thoigianhoc_lophocphan tgh ON tgh.ma_lop_hp = lhp.ma_lop_hp
    WHERE sv.user = ?
      AND lhp.ky_hoc_id = ?
    ORDER BY
      tgh.thu_trong_tuan ASC,
      tgh.ca_bat_dau_id ASC,
      lhp.id ASC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [user_id, ky_hoc_id]);

  return (rows as any[]).map((r) => ({
    ma_lop_hp: String(r.ma_lop_hp),
    ma_mon: String(r.ma_mon),
    ten_mon: String(r.ten_mon),
    ma_phong: String(r.ma_phong),
    toa_nha: r.toa_nha != null ? String(r.toa_nha) : null,
    thu_trong_tuan: Number(r.thu_trong_tuan),
    ca_bat_dau_id: Number(r.ca_bat_dau_id),
    ca_ket_thuc_id: Number(r.ca_ket_thuc_id),
  })) as TkbSinhVienRow[];
}

export type SinhVienMe = {
  id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;

  khoa_id: number | null;
  ma_khoa: string | null;
  ten_khoa: string | null;

  lop_nien_che: string | null;
  khoa_hoc: number | null;

  gioi_tinh_id: number | null;
  ten_gioi_tinh: string | null;

  ngay_sinh: string | null; // YYYY-MM-DD

  trang_thai_id: number;
  ten_trang_thai: string | null;

  user: number;
};

export async function getSinhVienMeByUserId(userId: number) {
  const sql = `
    SELECT
      sv.id,
      sv.ma_sv,
      sv.ho_ten,
      sv.email,
      sv.sdt,

      sv.khoa_id,
      k.ma_khoa,
      k.ten_khoa,

      sv.lop_nien_che,
      sv.khoa_hoc,

      sv.gioi_tinh_id,
      gt.ten_gioi_tinh,

      DATE_FORMAT(sv.ngay_sinh, '%Y-%m-%d') AS ngay_sinh,

      sv.trang_thai_id,
      ttsv.ten_trang_thai,

      sv.user
    FROM sinh_vien sv
    LEFT JOIN khoa k ON k.id = sv.khoa_id
    LEFT JOIN lookup_gioi_tinh gt ON gt.id = sv.gioi_tinh_id
    LEFT JOIN lookup_trang_thai_sv ttsv ON ttsv.id = sv.trang_thai_id
    WHERE sv.user = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);
  if (!rows.length) return null;

  const r: any = rows[0];

  return {
    id: Number(r.id),
    ma_sv: String(r.ma_sv),
    ho_ten: String(r.ho_ten),
    email: r.email != null ? String(r.email) : null,
    sdt: r.sdt != null ? String(r.sdt) : null,

    khoa_id: r.khoa_id != null ? Number(r.khoa_id) : null,
    ma_khoa: r.ma_khoa != null ? String(r.ma_khoa) : null,
    ten_khoa: r.ten_khoa != null ? String(r.ten_khoa) : null,

    lop_nien_che: r.lop_nien_che != null ? String(r.lop_nien_che) : null,
    khoa_hoc: r.khoa_hoc != null ? Number(r.khoa_hoc) : null,

    gioi_tinh_id: r.gioi_tinh_id != null ? Number(r.gioi_tinh_id) : null,
    ten_gioi_tinh: r.ten_gioi_tinh != null ? String(r.ten_gioi_tinh) : null,

    ngay_sinh: r.ngay_sinh != null ? String(r.ngay_sinh) : null,

    trang_thai_id: Number(r.trang_thai_id),
    ten_trang_thai: r.ten_trang_thai != null ? String(r.ten_trang_thai) : null,

    user: Number(r.user),
  } as SinhVienMe;
}
