import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

type StudentExamRow = RowDataPacket & {
  // lich_thi
  lich_thi_id: number;
  ma_lich_thi: string;
  ngay_thi: string;
  ca_hoc_tu: number;
  ca_hoc_toi: number;
  hinh_thuc_thi_id: number;
  so_luong_toi_da: string | number | null;
  so_luong_da_phan_bo: string | number | null;
  ghi_chu: string | null;

  // phong
  phong_id: number | null;
  ma_phong: string | null;
  toa_nha: string | null;

  // ca
  ma_ca_tu: string | null;
  gio_bat_dau: string | null;
  ma_ca_toi: string | null;
  gio_ket_thuc: string | null;

  // lhp + ky hoc
  lop_hoc_phan_id: number;
  ma_lop_hp: string;
  ky_hoc_id: number;

  hoc_ky: number | null;
  nam_hoc: string | null;

  // mon hoc
  mon_hoc_id: number | null;
  ma_mon: string | null;
  ten_mon: string | null;
  so_tin_chi: number | null;
  so_tiet_ly_thuyet: number | null;
  so_tiet_thuc_hanh: number | null;

  // giam thi
  giang_vien_id: number | null;
  ma_gv: string | null;
  ho_ten_gv: string | null;

  // ket_qua_hoc_tap (optional)
  diem_qua_trinh: string | number | null;
  diem_thi: string | number | null;
  diem_tong: string | number | null;
};

export interface StudentLichThiDTO {
  lich_thi_id: number;
  ma_lich_thi: string;
  ngay_thi: string;

  ca: {
    ca_hoc_tu: number;
    ca_hoc_toi: number;
    ma_ca_tu: string | null;
    gio_bat_dau: string | null;
    ma_ca_toi: string | null;
    gio_ket_thuc: string | null;
  };

  phong: {
    phong_id: number | null;
    ma_phong: string | null;
    toa_nha: string | null;
  };

  lop_hoc_phan: {
    lop_hoc_phan_id: number;
    ma_lop_hp: string;
    ky_hoc_id: number;
    ky_hoc: {
      hoc_ky: number | null;
      nam_hoc: string | null;
    };
    mon_hoc: {
      mon_hoc_id: number | null;
      ma_mon: string | null;
      ten_mon: string | null;
      so_tin_chi: number | null;
      so_tiet_ly_thuyet: number | null;
      so_tiet_thuc_hanh: number | null;
    };
  };

  giam_thi: {
    giang_vien_id: number | null;
    ma_gv: string | null;
    ho_ten: string | null;
  };

  hinh_thuc_thi_id: number;
  so_luong_toi_da: number;
  so_luong_da_phan_bo: number;
  ghi_chu: string | null;

  ket_qua_hoc_tap: {
    diem_qua_trinh: number | null;
    diem_thi: number | null;
    diem_tong: number | null;
  };
}

/**
 * Lấy lịch thi mà sinh viên ĐÃ ĐƯỢC PHÂN BỔ (pb table)
 * Map sinh viên từ token: sinh_vien.user = users.id
 */
export const getStudentLichThiService = async (
  userId: number,
  kyHocId?: number,
): Promise<StudentLichThiDTO[]> => {
  const params: Array<number> = [userId];
  let kyFilter = "";

  if (typeof kyHocId === "number" && !Number.isNaN(kyHocId)) {
    kyFilter = " AND lhp.ky_hoc_id = ? ";
    params.push(kyHocId);
  }

  const [rows] = await pool.query<StudentExamRow[]>(
    `
    SELECT
      lt.id AS lich_thi_id,
      lt.ma_lich_thi,
      lt.ngay_thi,
      lt.ca_hoc_tu,
      lt.ca_hoc_toi,
      lt.hinh_thuc_thi_id,
      lt.so_luong_toi_da,
      lt.so_luong_da_phan_bo,
      lt.ghi_chu,

      lt.phong_id,
      ph.ma_phong,
      ph.toa_nha,

      ctu.ma_ca  AS ma_ca_tu,
      ctu.gio_bat_dau,
      ctoi.ma_ca AS ma_ca_toi,
      ctoi.gio_ket_thuc,

      lhp.id AS lop_hoc_phan_id,
      lhp.ma_lop_hp,
      lhp.ky_hoc_id,

      kh.hoc_ky,
      kh.nam_hoc,

      mh.id AS mon_hoc_id,
      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi,
      mh.so_tiet_ly_thuyet,
      mh.so_tiet_thuc_hanh,

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

    LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    LEFT JOIN phong_hoc ph ON ph.id = lt.phong_id
    LEFT JOIN ca_hoc ctu ON ctu.id = lt.ca_hoc_tu
    LEFT JOIN ca_hoc ctoi ON ctoi.id = lt.ca_hoc_toi
    LEFT JOIN giang_vien gv ON gv.id = lt.giang_vien
    LEFT JOIN ket_qua_hoc_tap kq
      ON kq.sinh_vien_id = sv.id AND kq.lop_hoc_phan_id = lhp.id

    LEFT JOIN ky_hoc kh ON kh.id = lhp.ky_hoc_id

    WHERE sv.user = ?
    ${kyFilter}
    ORDER BY lt.ngay_thi ASC, ctu.gio_bat_dau ASC
    `,
    params,
  );

  return rows.map((r) => ({
    lich_thi_id: r.lich_thi_id,
    ma_lich_thi: r.ma_lich_thi,
    ngay_thi: r.ngay_thi,

    ca: {
      ca_hoc_tu: r.ca_hoc_tu,
      ca_hoc_toi: r.ca_hoc_toi,
      ma_ca_tu: r.ma_ca_tu,
      gio_bat_dau: r.gio_bat_dau,
      ma_ca_toi: r.ma_ca_toi,
      gio_ket_thuc: r.gio_ket_thuc,
    },

    phong: {
      phong_id: r.phong_id,
      ma_phong: r.ma_phong,
      toa_nha: r.toa_nha,
    },

    lop_hoc_phan: {
      lop_hoc_phan_id: r.lop_hoc_phan_id,
      ma_lop_hp: r.ma_lop_hp,
      ky_hoc_id: r.ky_hoc_id,
      ky_hoc: {
        hoc_ky: r.hoc_ky,
        nam_hoc: r.nam_hoc,
      },
      mon_hoc: {
        mon_hoc_id: r.mon_hoc_id,
        ma_mon: r.ma_mon,
        ten_mon: r.ten_mon,
        so_tin_chi: r.so_tin_chi,
        so_tiet_ly_thuyet: r.so_tiet_ly_thuyet,
        so_tiet_thuc_hanh: r.so_tiet_thuc_hanh,
      },
    },

    giam_thi: {
      giang_vien_id: r.giang_vien_id,
      ma_gv: r.ma_gv,
      ho_ten: r.ho_ten_gv,
    },

    hinh_thuc_thi_id: r.hinh_thuc_thi_id,
    so_luong_toi_da: Number(r.so_luong_toi_da ?? 0),
    so_luong_da_phan_bo: Number(r.so_luong_da_phan_bo ?? 0),
    ghi_chu: r.ghi_chu,

    ket_qua_hoc_tap: {
      diem_qua_trinh:
        r.diem_qua_trinh == null ? null : Number(r.diem_qua_trinh),
      diem_thi: r.diem_thi == null ? null : Number(r.diem_thi),
      diem_tong: r.diem_tong == null ? null : Number(r.diem_tong),
    },
  }));
};
