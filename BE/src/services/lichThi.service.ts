import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
// SỬA import pool đúng theo project của bạn
import { pool } from "../config/database";

export interface CreateLichThiBody {
  ma_lich_thi: string;
  lop_hoc_phan_id: number;
  phong_id: number;
  ngay_thi: string; // YYYY-MM-DD
  ca_hoc_tu: number;
  ca_hoc_toi: number;
  hinh_thuc_thi_id: number;
  giang_vien: number; // giảng viên coi thi
  so_luong_toi_da: number; // NEW
  ghi_chu?: string | null;
}

export interface LichThiRow {
  id: number;

  ma_lich_thi: string;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  // (tuỳ bạn có bảng mon_hoc không)
  mon_hoc_id?: number | null;
  ma_mon?: string | null;
  ten_mon?: string | null;

  // (tuỳ bạn có bảng ky_hoc không)
  ky_hoc_id?: number | null;

  phong_id: number;
  ma_phong: string;
  toa_nha: string | null;

  ngay_thi: string;

  ca_hoc_tu: number;
  ma_ca_tu: string;
  gio_bat_dau: string;

  ca_hoc_toi: number;
  ma_ca_toi: string;
  gio_ket_thuc: string;

  hinh_thuc_thi_id: number;

  giang_vien_id: number;
  ma_gv: string | null;
  ho_ten_gv: string | null;

  so_luong_toi_da: number;
  so_luong_da_phan_bo: number;

  ghi_chu: string | null;
  created_at?: string;
  updated_at?: string;
}

type CaHocRow = RowDataPacket & {
  id: number;
  gio_bat_dau: string;
  gio_ket_thuc: string;
};

async function getCaHocTimes(db: Pool, caTu: number, caToi: number) {
  const [rows] = await db.query<CaHocRow[]>(
    `SELECT id, gio_bat_dau, gio_ket_thuc FROM ca_hoc WHERE id IN (?, ?)`,
    [caTu, caToi],
  );

  if (rows.length !== 2) throw new Error("CA_HOC_NOT_FOUND");

  const from = rows.find((r) => r.id === caTu);
  const to = rows.find((r) => r.id === caToi);

  if (!from || !to) throw new Error("CA_HOC_NOT_FOUND");

  // so sánh string time HH:MM:SS OK
  if (from.gio_bat_dau >= to.gio_ket_thuc) throw new Error("INVALID_CA_RANGE");

  return { from, to };
}

const SQL_SELECT_ONE = `
SELECT
  lt.id,
  lt.ma_lich_thi,

  lt.lop_hoc_phan_id,
  lhp.ma_lop_hp,
  lhp.mon_hoc_id,
  lhp.ky_hoc_id,

  mh.ma_mon,
  mh.ten_mon,

  lt.phong_id,
  ph.ma_phong,
  ph.toa_nha,

  lt.ngay_thi,

  lt.ca_hoc_tu,
  ctu.ma_ca AS ma_ca_tu,
  ctu.gio_bat_dau,

  lt.ca_hoc_toi,
  ctoi.ma_ca AS ma_ca_toi,
  ctoi.gio_ket_thuc,

  lt.hinh_thuc_thi_id,

  lt.giang_vien AS giang_vien_id,
  gv.ma_gv,
  gv.ho_ten AS ho_ten_gv,

  lt.so_luong_toi_da,
  lt.so_luong_da_phan_bo,

  lt.ghi_chu,
  lt.created_at,
  lt.updated_at
FROM lich_thi lt
JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
JOIN phong_hoc ph ON ph.id = lt.phong_id
JOIN ca_hoc ctu ON ctu.id = lt.ca_hoc_tu
JOIN ca_hoc ctoi ON ctoi.id = lt.ca_hoc_toi
LEFT JOIN giang_vien gv ON gv.id = lt.giang_vien
WHERE lt.id = ?
`;

const SQL_SELECT_LIST = `
SELECT
  lt.id,
  lt.ma_lich_thi,

  lt.lop_hoc_phan_id,
  lhp.ma_lop_hp,
  lhp.mon_hoc_id,
  lhp.ky_hoc_id,

  mh.ma_mon,
  mh.ten_mon,

  lt.phong_id,
  ph.ma_phong,
  ph.toa_nha,

  lt.ngay_thi,

  lt.ca_hoc_tu,
  ctu.ma_ca AS ma_ca_tu,
  ctu.gio_bat_dau,

  lt.ca_hoc_toi,
  ctoi.ma_ca AS ma_ca_toi,
  ctoi.gio_ket_thuc,

  lt.hinh_thuc_thi_id,

  lt.giang_vien AS giang_vien_id,
  gv.ma_gv,
  gv.ho_ten AS ho_ten_gv,

  lt.so_luong_toi_da,
  lt.so_luong_da_phan_bo,

  lt.ghi_chu,
  lt.created_at,
  lt.updated_at
FROM lich_thi lt
JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
JOIN phong_hoc ph ON ph.id = lt.phong_id
JOIN ca_hoc ctu ON ctu.id = lt.ca_hoc_tu
JOIN ca_hoc ctoi ON ctoi.id = lt.ca_hoc_toi
LEFT JOIN giang_vien gv ON gv.id = lt.giang_vien
ORDER BY lt.ngay_thi DESC, ctu.gio_bat_dau ASC
`;

export const createLichThiService = async (body: CreateLichThiBody) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate ca học tồn tại + range hợp lệ
    const { from: newFrom, to: newTo } = await getCaHocTimes(
      conn as unknown as Pool,
      body.ca_hoc_tu,
      body.ca_hoc_toi,
    );

    // Validate số lượng
    const soLuongToiDa = Number(body.so_luong_toi_da);
    if (!Number.isFinite(soLuongToiDa) || soLuongToiDa < 0) {
      throw new Error("INVALID_CAPACITY");
    }

    // ✅ Check trùng phòng: cùng ngày + cùng phòng + overlap thời gian
    const [conflictRoom] = await conn.query<RowDataPacket[]>(
      `
      SELECT lt.id
      FROM lich_thi lt
      JOIN ca_hoc ex_from ON ex_from.id = lt.ca_hoc_tu
      JOIN ca_hoc ex_to   ON ex_to.id   = lt.ca_hoc_toi
      WHERE lt.ngay_thi = ?
        AND lt.phong_id = ?
        AND (? < ex_to.gio_ket_thuc AND ? > ex_from.gio_bat_dau)
      LIMIT 1
      `,
      [body.ngay_thi, body.phong_id, newFrom.gio_bat_dau, newTo.gio_ket_thuc],
    );
    if (conflictRoom.length > 0) throw new Error("ROOM_EXAM_CONFLICT");

    // ✅ Check trùng giảng viên coi thi: cùng ngày + cùng giảng viên + overlap thời gian
    const [conflictTeacher] = await conn.query<RowDataPacket[]>(
      `
      SELECT lt.id
      FROM lich_thi lt
      JOIN ca_hoc ex_from ON ex_from.id = lt.ca_hoc_tu
      JOIN ca_hoc ex_to   ON ex_to.id   = lt.ca_hoc_toi
      WHERE lt.ngay_thi = ?
        AND lt.giang_vien = ?
        AND (? < ex_to.gio_ket_thuc AND ? > ex_from.gio_bat_dau)
      LIMIT 1
      `,
      [body.ngay_thi, body.giang_vien, newFrom.gio_bat_dau, newTo.gio_ket_thuc],
    );
    if (conflictTeacher.length > 0) throw new Error("TEACHER_EXAM_CONFLICT");

    // Insert (so_luong_da_phan_bo mặc định 0 khi tạo)
    const [rs] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO lich_thi
        (ma_lich_thi, lop_hoc_phan_id, phong_id, ngay_thi, ca_hoc_tu, ca_hoc_toi, hinh_thuc_thi_id, giang_vien,
         so_luong_toi_da, so_luong_da_phan_bo, ghi_chu, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())
      `,
      [
        body.ma_lich_thi,
        body.lop_hoc_phan_id,
        body.phong_id,
        body.ngay_thi,
        body.ca_hoc_tu,
        body.ca_hoc_toi,
        body.hinh_thuc_thi_id,
        body.giang_vien,
        soLuongToiDa,
        body.ghi_chu ?? null,
      ],
    );

    const insertedId = rs.insertId;

    const [rows] = await conn.query<RowDataPacket[]>(SQL_SELECT_ONE, [
      insertedId,
    ]);

    await conn.commit();
    return (rows[0] ?? { id: insertedId }) as LichThiRow;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

export const getLichThiListService = async () => {
  const [rows] = await pool.query<RowDataPacket[]>(SQL_SELECT_LIST);
  return rows as unknown as LichThiRow[];
};
