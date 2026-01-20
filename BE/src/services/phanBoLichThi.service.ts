import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "../config/database";

type LichThiInfoRow = RowDataPacket & {
  id: number;
  ma_lich_thi: string;
  lop_hoc_phan_id: number;
  ma_lop_hp: string;
  mon_hoc_id: number;
  ky_hoc_id: number;
  so_luong_toi_da: any; // decimal có thể trả về string
  so_luong_da_phan_bo: any; // decimal có thể trả về string
};

type EligibleRow = RowDataPacket & { sinh_vien_id: number };

export const phanBoSinhVienVaoLichThiService = async (lichThiId: number) => {
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // LOCK lịch thi để tránh 2 người phân bổ cùng lúc vượt số lượng
    const [ltRows] = await conn.query<LichThiInfoRow[]>(
      `
      SELECT
        lt.id,
        lt.ma_lich_thi,
        lt.lop_hoc_phan_id,
        lhp.ma_lop_hp,
        lhp.mon_hoc_id,
        lhp.ky_hoc_id,
        lt.so_luong_toi_da,
        lt.so_luong_da_phan_bo
      FROM lich_thi lt
      JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
      WHERE lt.id = ?
      FOR UPDATE
      `,
      [lichThiId],
    );

    if (ltRows.length === 0) throw new Error("LICH_THI_NOT_FOUND");

    const lt = ltRows[0];

    const soLuongToiDa = Number(lt.so_luong_toi_da ?? 0);
    const soLuongDaPhanBo = Number(lt.so_luong_da_phan_bo ?? 0);

    const conTrong = soLuongToiDa - soLuongDaPhanBo;
    if (conTrong <= 0) throw new Error("CAPACITY_FULL");

    // SV đủ điều kiện: KQHT đúng LHP + diem_qua_trinh >=4 + chưa phân bổ lịch thi này
    const [eligibleRows] = await conn.query<EligibleRow[]>(
      `
      SELECT DISTINCT kq.sinh_vien_id
      FROM ket_qua_hoc_tap kq
      WHERE kq.lop_hoc_phan_id = ?
        AND kq.diem_qua_trinh >= 4
        AND NOT EXISTS (
          SELECT 1
          FROM phan_bo_sinh_vien_lich_thi pb
          WHERE pb.lich_thi_id = ?
            AND pb.sinh_vien_id = kq.sinh_vien_id
        )
      ORDER BY kq.sinh_vien_id ASC
      `,
      [lt.lop_hoc_phan_id, lt.id],
    );

    if (eligibleRows.length === 0) throw new Error("NO_ELIGIBLE_STUDENTS");

    const selected = eligibleRows.slice(0, conTrong);
    const ids = selected.map((x) => x.sinh_vien_id);

    // Bulk insert phân bổ
    const placeholders = ids.map(() => "(?, ?, NOW(), NOW())").join(", ");
    const params: number[] = [];
    ids.forEach((svId) => params.push(lt.id, svId));

    const [ins] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO phan_bo_sinh_vien_lich_thi (lich_thi_id, sinh_vien_id, created_at, updated_at)
      VALUES ${placeholders}
      `,
      params,
    );

    const insertedCount = Number(ins.affectedRows ?? ids.length);

    // Update lich_thi.so_luong_da_phan_bo
    await conn.query<ResultSetHeader>(
      `
      UPDATE lich_thi
      SET so_luong_da_phan_bo = COALESCE(so_luong_da_phan_bo, 0) + ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [insertedCount, lt.id],
    );

    await conn.commit();

    return {
      lich_thi: {
        id: lt.id,
        ma_lich_thi: lt.ma_lich_thi,
        lop_hoc_phan_id: lt.lop_hoc_phan_id,
        ma_lop_hp: lt.ma_lop_hp,
        mon_hoc_id: lt.mon_hoc_id,
        ky_hoc_id: lt.ky_hoc_id,
        so_luong_toi_da: soLuongToiDa,
        so_luong_da_phan_bo_truoc: soLuongDaPhanBo,
        so_luong_da_phan_bo_sau: soLuongDaPhanBo + insertedCount,
      },
      inserted_count: insertedCount,
      sinh_vien_ids: ids,
      con_trong_sau: conTrong - insertedCount,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};
