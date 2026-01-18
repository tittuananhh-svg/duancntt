import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/database";

function chunkArray<T>(arr: T[], size = 300) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type ItemInput = { sinh_vien_id: number; diem_qua_trinh: number };

export async function upsertDiemQuaTrinh(params: {
  userId: number; // lấy từ token
  lop_hoc_phan_id: number;
  items: ItemInput[]; // 1 hoặc nhiều
}) {
  const { userId, lop_hoc_phan_id } = params;

  // normalize + validate items
  const map = new Map<number, number>();
  for (const it of params.items) {
    const svId = Number(it.sinh_vien_id);
    const dqt = Number(it.diem_qua_trinh);

    if (!Number.isFinite(svId) || svId <= 0) continue;
    if (!Number.isFinite(dqt)) continue;

    if (dqt < 0 || dqt > 10) {
      throw new Error(`DIEM_QUA_TRINH_INVALID_${svId}`);
    }

    map.set(svId, dqt);
  }

  const items: ItemInput[] = Array.from(map.entries()).map(
    ([sinh_vien_id, diem_qua_trinh]) => ({
      sinh_vien_id,
      diem_qua_trinh,
    }),
  );

  if (!items.length) throw new Error("ITEMS_EMPTY");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [lhpRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT lhp.id
      FROM lop_hoc_phan lhp
      JOIN giang_vien gv ON gv.id = lhp.giang_vien_id
      WHERE lhp.id = ?
        AND gv.user = ?
      LIMIT 1
      FOR UPDATE
      `,
      [lop_hoc_phan_id, userId],
    );

    if (!lhpRows.length) {
      throw new Error("LOP_HOC_PHAN_NOT_FOUND_OR_FORBIDDEN");
    }

    const allIds = items.map((x) => x.sinh_vien_id);
    const okIdSet = new Set<number>();

    for (const part of chunkArray(allIds, 500)) {
      const placeholders = part.map(() => "?").join(",");
      const [rows] = await conn.query<RowDataPacket[]>(
        `
        SELECT dklhp.sinh_vien_id
        FROM dang_ky_lop_hoc_phan dklhp
        WHERE dklhp.lop_hoc_phan_id = ?
          AND dklhp.sinh_vien_id IN (${placeholders})
        `,
        [lop_hoc_phan_id, ...part],
      );
      for (const r of rows as any[]) okIdSet.add(Number(r.sinh_vien_id));
    }

    const accepted = items.filter((x) => okIdSet.has(x.sinh_vien_id));
    const rejected = items.filter((x) => !okIdSet.has(x.sinh_vien_id)); // SV chưa đăng ký LHP

    if (!accepted.length) {
      await conn.rollback();
      return {
        lop_hoc_phan_id,
        updated: 0,
        accepted: 0,
        rejected: rejected.map((x) => x.sinh_vien_id),
        message: "Không có sinh viên hợp lệ (chưa đăng ký lớp học phần)",
      };
    }

    let affected = 0;

    for (const part of chunkArray(accepted, 200)) {
      const valuesSql = part
        .map(() => `(?, ?, ?, 1, NOW(), ?, NOW(), NOW())`)
        .join(", ");

      const sql = `
        INSERT INTO ket_qua_hoc_tap
          (sinh_vien_id, lop_hoc_phan_id, diem_qua_trinh, lan_thi, ngay_nhap_diem, nguoi_nhap_id, created_at, updated_at)
        VALUES ${valuesSql}
        ON DUPLICATE KEY UPDATE
          diem_qua_trinh = VALUES(diem_qua_trinh),
          ngay_nhap_diem = VALUES(ngay_nhap_diem),
          nguoi_nhap_id = VALUES(nguoi_nhap_id),
          updated_at = NOW()
      `;

      const paramsSql: any[] = [];
      for (const it of part) {
        paramsSql.push(
          it.sinh_vien_id,
          lop_hoc_phan_id,
          it.diem_qua_trinh,
          userId,
        );
      }

      const [rs] = await conn.query<ResultSetHeader>(sql, paramsSql);
      affected += Number(rs.affectedRows ?? 0);
    }

    await conn.commit();

    return {
      lop_hoc_phan_id,
      accepted: accepted.length,
      rejected: rejected.map((x) => x.sinh_vien_id),
      affected_rows: affected,
      message: "Cập nhật điểm quá trình thành công",
    };
  } catch (e: any) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
