import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

/** =========================
 *  DTO (flat)
 *  ========================= */

export interface SinhVienDaPhanBoFlat {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;

  ky_hoc_id: number;
  hoc_ky: number | null;
  nam_hoc: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  mon_hoc_id: number | null;
  ma_mon: string | null;
  ten_mon: string | null;
  so_tin_chi: number | null;

  lich_thi_id: number;
  ma_lich_thi: string;
  ngay_thi: string;
  ca_hoc_tu: number;
  ca_hoc_toi: number;

  ma_ca_tu: string | null;
  gio_bat_dau: string | null;
  ma_ca_toi: string | null;
  gio_ket_thuc: string | null;

  phong_id: number | null;
  ma_phong: string | null;
  toa_nha: string | null;

  giang_vien_id: number | null;
  ma_gv: string | null;
  ho_ten_gv: string | null;

  diem_qua_trinh: number | null;
  diem_thi: number | null;
  diem_tong: number | null;
}

export interface SinhVienDuDieuKienChuaPhanBoFlat {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;

  ky_hoc_id: number;
  hoc_ky: number | null;
  nam_hoc: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  mon_hoc_id: number | null;
  ma_mon: string | null;
  ten_mon: string | null;
  so_tin_chi: number | null;

  diem_qua_trinh: number;
  diem_thi: number | null;
  diem_tong: number | null;
}

/** =========================
 *  1) SV đã phân bổ lịch thi trong kỳ (flat)
 *  Nếu 1 SV có 2 lịch thi -> trả 2 dòng
 *  ========================= */

type DaPhanBoRow = RowDataPacket & {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;

  ky_hoc_id: number;
  hoc_ky: number | null;
  nam_hoc: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  mon_hoc_id: number | null;
  ma_mon: string | null;
  ten_mon: string | null;
  so_tin_chi: number | null;

  lich_thi_id: number;
  ma_lich_thi: string;
  ngay_thi: string;
  ca_hoc_tu: number;
  ca_hoc_toi: number;

  ma_ca_tu: string | null;
  gio_bat_dau: string | null;
  ma_ca_toi: string | null;
  gio_ket_thuc: string | null;

  phong_id: number | null;
  ma_phong: string | null;
  toa_nha: string | null;

  giang_vien_id: number | null;
  ma_gv: string | null;
  ho_ten_gv: string | null;

  diem_qua_trinh: string | number | null;
  diem_thi: string | number | null;
  diem_tong: string | number | null;
};

export const getSinhVienDaPhanBoTrongKyService = async (
  kyHocId: number,
): Promise<SinhVienDaPhanBoFlat[]> => {
  const [rows] = await pool.query<DaPhanBoRow[]>(
    `
    SELECT
      sv.id  AS sinh_vien_id,
      sv.ma_sv,
      sv.ho_ten,
      sv.email,
      sv.sdt,

      lhp.ky_hoc_id,
      kh.hoc_ky,
      kh.nam_hoc,

      lhp.id AS lop_hoc_phan_id,
      lhp.ma_lop_hp,

      mh.id AS mon_hoc_id,
      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi,

      lt.id AS lich_thi_id,
      lt.ma_lich_thi,
      lt.ngay_thi,
      lt.ca_hoc_tu,
      lt.ca_hoc_toi,

      ctu.ma_ca  AS ma_ca_tu,
      ctu.gio_bat_dau,
      ctoi.ma_ca AS ma_ca_toi,
      ctoi.gio_ket_thuc,

      ph.id AS phong_id,
      ph.ma_phong,
      ph.toa_nha,

      gv.id AS giang_vien_id,
      gv.ma_gv,
      gv.ho_ten AS ho_ten_gv,

      kq.diem_qua_trinh,
      kq.diem_thi,
      kq.diem_tong
    FROM phan_bo_sinh_vien_lich_thi pb
    JOIN lich_thi lt ON lt.id = pb.lich_thi_id
    JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
    JOIN sinh_vien sv ON sv.id = pb.sinh_vien_id

    LEFT JOIN ky_hoc kh ON kh.id = lhp.ky_hoc_id
    LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    LEFT JOIN ca_hoc ctu ON ctu.id = lt.ca_hoc_tu
    LEFT JOIN ca_hoc ctoi ON ctoi.id = lt.ca_hoc_toi
    LEFT JOIN phong_hoc ph ON ph.id = lt.phong_id
    LEFT JOIN giang_vien gv ON gv.id = lt.giang_vien

    LEFT JOIN ket_qua_hoc_tap kq
      ON kq.sinh_vien_id = sv.id AND kq.lop_hoc_phan_id = lhp.id

    WHERE lhp.ky_hoc_id = ?
    ORDER BY sv.ma_sv ASC, lt.ngay_thi ASC, ctu.gio_bat_dau ASC
    `,
    [kyHocId],
  );

  return rows.map((r) => ({
    sinh_vien_id: r.sinh_vien_id,
    ma_sv: r.ma_sv,
    ho_ten: r.ho_ten,
    email: r.email,
    sdt: r.sdt,

    ky_hoc_id: r.ky_hoc_id,
    hoc_ky: r.hoc_ky,
    nam_hoc: r.nam_hoc,

    lop_hoc_phan_id: r.lop_hoc_phan_id,
    ma_lop_hp: r.ma_lop_hp,

    mon_hoc_id: r.mon_hoc_id,
    ma_mon: r.ma_mon,
    ten_mon: r.ten_mon,
    so_tin_chi: r.so_tin_chi,

    lich_thi_id: r.lich_thi_id,
    ma_lich_thi: r.ma_lich_thi,
    ngay_thi: r.ngay_thi,
    ca_hoc_tu: r.ca_hoc_tu,
    ca_hoc_toi: r.ca_hoc_toi,

    ma_ca_tu: r.ma_ca_tu,
    gio_bat_dau: r.gio_bat_dau,
    ma_ca_toi: r.ma_ca_toi,
    gio_ket_thuc: r.gio_ket_thuc,

    phong_id: r.phong_id,
    ma_phong: r.ma_phong,
    toa_nha: r.toa_nha,

    giang_vien_id: r.giang_vien_id,
    ma_gv: r.ma_gv,
    ho_ten_gv: r.ho_ten_gv,

    diem_qua_trinh: r.diem_qua_trinh == null ? null : Number(r.diem_qua_trinh),
    diem_thi: r.diem_thi == null ? null : Number(r.diem_thi),
    diem_tong: r.diem_tong == null ? null : Number(r.diem_tong),
  }));
};

/** =========================
 *  2) SV đủ điều kiện (điểm QT >=4) nhưng CHƯA phân bổ lịch thi trong kỳ (flat)
 *  Nếu 1 SV có 2 môn/lhp đủ điều kiện mà chưa phân bổ -> trả 2 dòng
 *  ========================= */

type ChuaPhanBoRow = RowDataPacket & {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;

  ky_hoc_id: number;
  hoc_ky: number | null;
  nam_hoc: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  mon_hoc_id: number | null;
  ma_mon: string | null;
  ten_mon: string | null;
  so_tin_chi: number | null;

  diem_qua_trinh: string | number | null;
  diem_thi: string | number | null;
  diem_tong: string | number | null;
};

export const getSinhVienDuDieuKienChuaPhanBoTrongKyService = async (
  kyHocId: number,
): Promise<SinhVienDuDieuKienChuaPhanBoFlat[]> => {
  const [rows] = await pool.query<ChuaPhanBoRow[]>(
    `
    SELECT
      sv.id AS sinh_vien_id,
      sv.ma_sv,
      sv.ho_ten,
      sv.email,
      sv.sdt,

      lhp.ky_hoc_id,
      kh.hoc_ky,
      kh.nam_hoc,

      lhp.id AS lop_hoc_phan_id,
      lhp.ma_lop_hp,

      mh.id AS mon_hoc_id,
      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi,

      kq.diem_qua_trinh,
      kq.diem_thi,
      kq.diem_tong
    FROM ket_qua_hoc_tap kq
    JOIN sinh_vien sv ON sv.id = kq.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = kq.lop_hoc_phan_id

    LEFT JOIN ky_hoc kh ON kh.id = lhp.ky_hoc_id
    LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id

    WHERE lhp.ky_hoc_id = ?
      AND COALESCE(kq.diem_qua_trinh, 0) >= 4
      AND NOT EXISTS (
        SELECT 1
        FROM lich_thi lt
        JOIN phan_bo_sinh_vien_lich_thi pb ON pb.lich_thi_id = lt.id
        WHERE lt.lop_hoc_phan_id = lhp.id
          AND pb.sinh_vien_id = sv.id
      )
    ORDER BY sv.ma_sv ASC, lhp.ma_lop_hp ASC
    `,
    [kyHocId],
  );

  return rows.map((r) => ({
    sinh_vien_id: r.sinh_vien_id,
    ma_sv: r.ma_sv,
    ho_ten: r.ho_ten,
    email: r.email,
    sdt: r.sdt,

    ky_hoc_id: r.ky_hoc_id,
    hoc_ky: r.hoc_ky,
    nam_hoc: r.nam_hoc,

    lop_hoc_phan_id: r.lop_hoc_phan_id,
    ma_lop_hp: r.ma_lop_hp,

    mon_hoc_id: r.mon_hoc_id,
    ma_mon: r.ma_mon,
    ten_mon: r.ten_mon,
    so_tin_chi: r.so_tin_chi,

    diem_qua_trinh: Number(r.diem_qua_trinh ?? 0), // vì điều kiện >=4 nên coi như có số
    diem_thi: r.diem_thi == null ? null : Number(r.diem_thi),
    diem_tong: r.diem_tong == null ? null : Number(r.diem_tong),
  }));
};
