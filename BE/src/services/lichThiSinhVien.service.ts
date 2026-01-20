import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

type AllocatedRow = RowDataPacket & {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;
  lop_nien_che: string | null;

  lich_thi_id: number;
  ma_lich_thi: string;
  ngay_thi: string;
  ca_hoc_tu: number;
  ca_hoc_toi: number;

  phong_id: number;
  ma_phong: string | null;
  toa_nha: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  mon_hoc_id: number;
  ma_mon: string | null;
  ten_mon: string | null;
};

export interface AllocatedStudentDTO {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;
  lop_nien_che: string | null;
  so_lich_thi: number;
  lich_thi: Array<{
    lich_thi_id: number;
    ma_lich_thi: string;
    ngay_thi: string;
    ca_hoc_tu: number;
    ca_hoc_toi: number;
    phong: {
      phong_id: number;
      ma_phong: string | null;
      toa_nha: string | null;
    };
    lop_hoc_phan: {
      lop_hoc_phan_id: number;
      ma_lop_hp: string;
      mon_hoc: {
        mon_hoc_id: number;
        ma_mon: string | null;
        ten_mon: string | null;
      };
    };
  }>;
}

export const getSinhVienDaPhanBoLichThiTrongKyService = async (
  kyHocId: number,
): Promise<AllocatedStudentDTO[]> => {
  const [rows] = await pool.query<AllocatedRow[]>(
    `
    SELECT
      sv.id AS sinh_vien_id,
      sv.ma_sv,
      sv.ho_ten,
      sv.email,
      sv.sdt,
      sv.lop_nien_che,

      lt.id AS lich_thi_id,
      lt.ma_lich_thi,
      lt.ngay_thi,
      lt.ca_hoc_tu,
      lt.ca_hoc_toi,

      lt.phong_id,
      ph.ma_phong,
      ph.toa_nha,

      lhp.id AS lop_hoc_phan_id,
      lhp.ma_lop_hp,

      lhp.mon_hoc_id,
      mh.ma_mon,
      mh.ten_mon
    FROM phan_bo_sinh_vien_lich_thi pb
    JOIN lich_thi lt ON lt.id = pb.lich_thi_id
    JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
    JOIN sinh_vien sv ON sv.id = pb.sinh_vien_id
    LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    LEFT JOIN phong_hoc ph ON ph.id = lt.phong_id
    WHERE lhp.ky_hoc_id = ?
    ORDER BY sv.id, lt.ngay_thi, lt.ca_hoc_tu
    `,
    [kyHocId],
  );

  const map = new Map<number, AllocatedStudentDTO>();

  for (const r of rows) {
    if (!map.has(r.sinh_vien_id)) {
      map.set(r.sinh_vien_id, {
        sinh_vien_id: r.sinh_vien_id,
        ma_sv: r.ma_sv,
        ho_ten: r.ho_ten,
        email: r.email,
        sdt: r.sdt,
        lop_nien_che: r.lop_nien_che,
        so_lich_thi: 0,
        lich_thi: [],
      });
    }

    const sv = map.get(r.sinh_vien_id)!;

    const existed = sv.lich_thi.some((x) => x.lich_thi_id === r.lich_thi_id);
    if (!existed) {
      sv.lich_thi.push({
        lich_thi_id: r.lich_thi_id,
        ma_lich_thi: r.ma_lich_thi,
        ngay_thi: r.ngay_thi,
        ca_hoc_tu: r.ca_hoc_tu,
        ca_hoc_toi: r.ca_hoc_toi,
        phong: {
          phong_id: r.phong_id,
          ma_phong: r.ma_phong,
          toa_nha: r.toa_nha,
        },
        lop_hoc_phan: {
          lop_hoc_phan_id: r.lop_hoc_phan_id,
          ma_lop_hp: r.ma_lop_hp,
          mon_hoc: {
            mon_hoc_id: r.mon_hoc_id,
            ma_mon: r.ma_mon,
            ten_mon: r.ten_mon,
          },
        },
      });
      sv.so_lich_thi = sv.lich_thi.length;
    }
  }

  return Array.from(map.values());
};

type EligibleRow = RowDataPacket & {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;
  lop_nien_che: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  mon_hoc_id: number;
  ma_mon: string | null;
  ten_mon: string | null;

  diem_qua_trinh: number;
};

export interface EligibleStudentDTO {
  sinh_vien_id: number;
  ma_sv: string;
  ho_ten: string;
  email: string | null;
  sdt: string | null;
  lop_nien_che: string | null;
  so_lop_du_dieu_kien: number;
  lop_du_dieu_kien: Array<{
    lop_hoc_phan_id: number;
    ma_lop_hp: string;
    diem_qua_trinh: number;
    mon_hoc: {
      mon_hoc_id: number;
      ma_mon: string | null;
      ten_mon: string | null;
    };
  }>;
}

export const getSinhVienDuDieuKienChuaPhanBoTrongKyService = async (
  kyHocId: number,
): Promise<EligibleStudentDTO[]> => {
  const [rows] = await pool.query<EligibleRow[]>(
    `
    SELECT
      sv.id AS sinh_vien_id,
      sv.ma_sv,
      sv.ho_ten,
      sv.email,
      sv.sdt,
      sv.lop_nien_che,

      kq.lop_hoc_phan_id,
      lhp.ma_lop_hp,

      lhp.mon_hoc_id,
      mh.ma_mon,
      mh.ten_mon,

      kq.diem_qua_trinh
    FROM ket_qua_hoc_tap kq
    JOIN lop_hoc_phan lhp ON lhp.id = kq.lop_hoc_phan_id
    JOIN sinh_vien sv ON sv.id = kq.sinh_vien_id
    LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    WHERE lhp.ky_hoc_id = ?
      AND kq.diem_qua_trinh >= 4
      AND NOT EXISTS (
        SELECT 1
        FROM phan_bo_sinh_vien_lich_thi pb
        JOIN lich_thi lt ON lt.id = pb.lich_thi_id
        JOIN lop_hoc_phan lhp2 ON lhp2.id = lt.lop_hoc_phan_id
        WHERE pb.sinh_vien_id = sv.id
          AND lhp2.ky_hoc_id = ?
      )
    ORDER BY sv.id, lhp.id
    `,
    [kyHocId, kyHocId],
  );

  const map = new Map<number, EligibleStudentDTO>();

  for (const r of rows) {
    if (!map.has(r.sinh_vien_id)) {
      map.set(r.sinh_vien_id, {
        sinh_vien_id: r.sinh_vien_id,
        ma_sv: r.ma_sv,
        ho_ten: r.ho_ten,
        email: r.email,
        sdt: r.sdt,
        lop_nien_che: r.lop_nien_che,
        so_lop_du_dieu_kien: 0,
        lop_du_dieu_kien: [],
      });
    }

    const sv = map.get(r.sinh_vien_id)!;

    // tránh trùng LHP
    const existed = sv.lop_du_dieu_kien.some(
      (x) => x.lop_hoc_phan_id === r.lop_hoc_phan_id,
    );
    if (!existed) {
      sv.lop_du_dieu_kien.push({
        lop_hoc_phan_id: r.lop_hoc_phan_id,
        ma_lop_hp: r.ma_lop_hp,
        diem_qua_trinh: r.diem_qua_trinh,
        mon_hoc: {
          mon_hoc_id: r.mon_hoc_id,
          ma_mon: r.ma_mon,
          ten_mon: r.ten_mon,
        },
      });
      sv.so_lop_du_dieu_kien = sv.lop_du_dieu_kien.length;
    }
  }

  return Array.from(map.values());
};
