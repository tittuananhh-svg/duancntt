import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/database";

export interface CreateLichThiBody {
  ma_lich_thi: string;
  lop_hoc_phan_id: number;
  phong_id: number;
  ngay_thi: string; // YYYY-MM-DD
  ca_hoc_tu: number;
  ca_hoc_toi: number;
  hinh_thuc_thi_id: number;
  giang_vien: number; // giảng viên coi thi (FK giang_vien.id)
  ghi_chu?: string | null;
}

export interface LichThiRow {
  id: number;
  ma_lich_thi: string;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;

  ngay_thi: string;

  phong_id: number;
  ma_phong: string;
  toa_nha: string | null;

  ca_hoc_tu: number;
  ma_ca_tu: string;
  gio_bat_dau: string;

  ca_hoc_toi: number;
  ma_ca_toi: string;
  gio_ket_thuc: string;

  hinh_thuc_thi_id: number;

  giang_vien_id: number;
  ma_gv: string | null;
  ten_giang_vien: string | null;

  ghi_chu: string | null;

  created_at?: string;
  updated_at?: string;
}

type CaHocRow = RowDataPacket & {
  id: number;
  gio_bat_dau: string;
  gio_ket_thuc: string;
};

const SQL_SELECT_ONE = `
SELECT
  lt.id,
  lt.ma_lich_thi,

  lt.lop_hoc_phan_id,
  lhp.ma_lop_hp,

  lt.ngay_thi,

  lt.phong_id,
  ph.ma_phong,
  ph.toa_nha,

  lt.ca_hoc_tu,
  ctu.ma_ca AS ma_ca_tu,
  ctu.gio_bat_dau,

  lt.ca_hoc_toi,
  ctoi.ma_ca AS ma_ca_toi,
  ctoi.gio_ket_thuc,

  lt.hinh_thuc_thi_id,

  lt.giang_vien AS giang_vien_id,
  gv.ma_gv,
  gv.ho_ten AS ten_giang_vien,

  lt.ghi_chu,
  lt.created_at,
  lt.updated_at
FROM lich_thi lt
JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
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

  lt.ngay_thi,

  lt.phong_id,
  ph.ma_phong,
  ph.toa_nha,

  lt.ca_hoc_tu,
  ctu.ma_ca AS ma_ca_tu,
  ctu.gio_bat_dau,

  lt.ca_hoc_toi,
  ctoi.ma_ca AS ma_ca_toi,
  ctoi.gio_ket_thuc,

  lt.hinh_thuc_thi_id,

  lt.giang_vien AS giang_vien_id,
  gv.ma_gv,
  gv.ho_ten AS ten_giang_vien,

  lt.ghi_chu,
  lt.created_at,
  lt.updated_at
FROM lich_thi lt
JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
JOIN phong_hoc ph ON ph.id = lt.phong_id
JOIN ca_hoc ctu ON ctu.id = lt.ca_hoc_tu
JOIN ca_hoc ctoi ON ctoi.id = lt.ca_hoc_toi
LEFT JOIN giang_vien gv ON gv.id = lt.giang_vien
ORDER BY lt.ngay_thi DESC, ctu.gio_bat_dau ASC
`;

async function getCaHocTimes(db: Pool, caTu: number, caToi: number) {
  const [rows] = await db.query<CaHocRow[]>(
    `SELECT id, gio_bat_dau, gio_ket_thuc FROM ca_hoc WHERE id IN (?, ?)`,
    [caTu, caToi],
  );

  if (rows.length !== 2) throw new Error("CA_HOC_NOT_FOUND");

  const from = rows.find((r) => r.id === caTu);
  const to = rows.find((r) => r.id === caToi);

  if (!from || !to) throw new Error("CA_HOC_NOT_FOUND");

  // kiểm tra giờ hợp lệ (HH:MM:SS so sánh string OK)
  if (from.gio_bat_dau >= to.gio_ket_thuc) throw new Error("INVALID_CA_RANGE");

  return { from, to };
}

export const createLichThiService = async (body: CreateLichThiBody) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) validate ca tồn tại + range hợp lệ
    const { from: newFrom, to: newTo } = await getCaHocTimes(
      conn as unknown as Pool,
      body.ca_hoc_tu,
      body.ca_hoc_toi,
    );

    // 2) CHECK TRÙNG PHÒNG: cùng ngày + cùng phòng + overlap thời gian
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

    if (conflictRoom.length > 0) {
      throw new Error("ROOM_EXAM_CONFLICT");
    }

    // 3) CHECK TRÙNG GIẢNG VIÊN: cùng ngày + cùng giảng viên + overlap thời gian
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

    if (conflictTeacher.length > 0) {
      throw new Error("TEACHER_EXAM_CONFLICT");
    }

    // 4) Insert
    const [rs] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO lich_thi
        (ma_lich_thi, lop_hoc_phan_id, phong_id, ngay_thi, ca_hoc_tu, ca_hoc_toi, hinh_thuc_thi_id, giang_vien, ghi_chu, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
        body.ghi_chu ?? null,
      ],
    );

    const insertedId = rs.insertId;

    // 5) trả về row đã join text
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
