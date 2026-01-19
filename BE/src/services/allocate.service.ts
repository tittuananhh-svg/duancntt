import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/database";

type PrereqRow = {
  mon_hoc_tien_quyet_id: number;
  loai_dieu_kien: "qua_mon" | "song_hanh";
  diem_toi_thieu: number | null;
  tin_chi_toi_thieu: number | null;
};

type TxConn = {
  query: (sql: string, params?: any[]) => Promise<[any, any]>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  release: () => void;
};

function chunkArray<T>(arr: T[], size = 500) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function intersect(a: number[], bSet: Set<number>) {
  return a.filter((x) => bSet.has(x));
}

/** PASS môn (xep_loai_id <= 4), có thể kèm điều kiện điểm tối thiểu */
async function getPassedStudentIdsForCourse(
  conn: TxConn,
  monHocId: number,
  candidateIds: number[],
  diemToiThieu: number | null,
): Promise<Set<number>> {
  const ok = new Set<number>();
  const chunks = chunkArray(candidateIds, 500);

  for (const part of chunks) {
    const placeholders = part.map(() => "?").join(",");

    const sql = `
      SELECT DISTINCT kq.sinh_vien_id
      FROM ket_qua_hoc_tap kq
      JOIN lop_hoc_phan lhp ON lhp.id = kq.lop_hoc_phan_id
      WHERE lhp.mon_hoc_id = ?
        AND kq.xep_loai_id <= 4
        ${diemToiThieu != null ? "AND kq.diem_tong >= ?" : ""}
        AND kq.sinh_vien_id IN (${placeholders})
    `;

    const params: any[] = [monHocId];
    if (diemToiThieu != null) params.push(diemToiThieu);
    params.push(...part);

    const [rowsAny] = await conn.query(sql, params);
    const rows = rowsAny as RowDataPacket[];

    for (const r of rows as any[]) ok.add(Number((r as any).sinh_vien_id));
  }

  return ok;
}

/** Đang đăng ký môn trong KỲ (dùng cho điều kiện song_hanh) */
async function getCurrentlyRegisteredStudentIdsForCourseInKy(
  conn: TxConn,
  monHocId: number,
  kyHocId: number,
  candidateIds: number[],
): Promise<Set<number>> {
  const ok = new Set<number>();
  const chunks = chunkArray(candidateIds, 500);

  for (const part of chunks) {
    const placeholders = part.map(() => "?").join(",");

    const sql = `
      SELECT DISTINCT dklhp.sinh_vien_id
      FROM dang_ky_lop_hoc_phan dklhp
      JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
      WHERE lhp.mon_hoc_id = ?
        AND lhp.ky_hoc_id = ?
        AND dklhp.sinh_vien_id IN (${placeholders})
    `;

    const params: any[] = [monHocId, kyHocId, ...part];

    const [rowsAny] = await conn.query(sql, params);
    const rows = rowsAny as RowDataPacket[];

    for (const r of rows as any[]) ok.add(Number((r as any).sinh_vien_id));
  }

  return ok;
}

/** Tổng tín chỉ PASS (xep_loai_id<=4), DISTINCT mon_hoc_id */
async function getStudentsMeetingMinCredits(
  conn: TxConn,
  minCredits: number,
  candidateIds: number[],
): Promise<Set<number>> {
  const ok = new Set<number>();
  const chunks = chunkArray(candidateIds, 400);

  for (const part of chunks) {
    const placeholders = part.map(() => "?").join(",");

    const sql = `
      SELECT t.sinh_vien_id
      FROM (
        SELECT DISTINCT kq.sinh_vien_id, lhp.mon_hoc_id
        FROM ket_qua_hoc_tap kq
        JOIN lop_hoc_phan lhp ON lhp.id = kq.lop_hoc_phan_id
        WHERE kq.xep_loai_id <= 4
          AND kq.sinh_vien_id IN (${placeholders})
      ) t
      JOIN mon_hoc mh ON mh.id = t.mon_hoc_id
      GROUP BY t.sinh_vien_id
      HAVING SUM(mh.so_tin_chi) >= ?
    `;

    const params: any[] = [...part, minCredits];

    const [rowsAny] = await conn.query(sql, params);
    const rows = rowsAny as RowDataPacket[];

    for (const r of rows as any[]) ok.add(Number((r as any).sinh_vien_id));
  }

  return ok;
}

/** Lọc tiên quyết cho 1 môn trong 1 kỳ */
async function filterByPrerequisitesInKy(
  conn: TxConn,
  monHocId: number,
  kyHocId: number,
  candidateIds: number[],
): Promise<number[]> {
  const [prereqRowsAny] = await conn.query(
    `
    SELECT mon_hoc_tien_quyet_id, loai_dieu_kien, diem_toi_thieu, tin_chi_toi_thieu
    FROM mon_hoc_tien_quyet
    WHERE mon_hoc_id = ?
    `,
    [monHocId],
  );
  const prereqRows = prereqRowsAny as RowDataPacket[];

  if (!prereqRows.length) return candidateIds;

  let current = candidateIds.slice();

  for (const prAny of prereqRows as any[]) {
    if (!current.length) break;

    const pr = prAny as PrereqRow;

    let satisfied = new Set<number>();

    if (pr.loai_dieu_kien === "qua_mon") {
      satisfied = await getPassedStudentIdsForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        current,
        pr.diem_toi_thieu,
      );
    } else {
      const passed = await getPassedStudentIdsForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        current,
        pr.diem_toi_thieu,
      );
      const registered = await getCurrentlyRegisteredStudentIdsForCourseInKy(
        conn,
        pr.mon_hoc_tien_quyet_id,
        kyHocId,
        current,
      );
      satisfied = new Set<number>([...passed, ...registered]);
    }

    if (pr.tin_chi_toi_thieu != null) {
      const okCredits = await getStudentsMeetingMinCredits(
        conn,
        pr.tin_chi_toi_thieu,
        current,
      );
      const next = new Set<number>();
      for (const id of satisfied) if (okCredits.has(id)) next.add(id);
      satisfied = next;
    }

    current = intersect(current, satisfied);
  }

  return current;
}

/** =========================
 *  ✅ 1) PHÂN BỔ 1 MÔN TRONG KỲ (FIX capacity check)
 *  - so_luong_can_phan_bo = TỔNG SỐ SV muốn phân bổ cho MÔN đó (trên tất cả LHP)
 *  ========================= */
export async function allocateSinhVienToMonHocInKy(params: {
  ky_hoc_id: number;
  mon_hoc_id: number;
  so_luong_can_phan_bo?: number; // total requested for this subject across all sections
  trang_thai_id?: number;
  ghi_chu?: string;
}) {
  const ky_hoc_id = Number(params.ky_hoc_id);
  const mon_hoc_id = Number(params.mon_hoc_id);
  const trang_thai_id = params.trang_thai_id ?? 1;
  const ghi_chu = params.ghi_chu ?? "PHAN_BO_TU_DONG";

  const requested =
    params.so_luong_can_phan_bo != null
      ? Number(params.so_luong_can_phan_bo)
      : undefined;

  if (requested != null && (!Number.isFinite(requested) || requested <= 0)) {
    return { ok: false, error: "SO_LUONG_CAN_PHAN_BO_INVALID" };
  }

  const conn = (await pool.getConnection()) as unknown as TxConn;

  try {
    await conn.beginTransaction();

    // check môn tồn tại
    const [mhAny] = await conn.query(
      `SELECT id FROM mon_hoc WHERE id = ? LIMIT 1`,
      [mon_hoc_id],
    );
    const mh = mhAny as RowDataPacket[];
    if (!mh.length) {
      await conn.rollback();
      return { ok: false, error: "MON_HOC_NOT_FOUND" };
    }

    // ✅ LOCK TOÀN BỘ LHP của môn trong kỳ (KHÔNG LIMIT 1)
    const [lhpRowsAny] = await conn.query(
      `
      SELECT id, si_so_toi_da, IFNULL(si_so_thuc_te, 0) AS si_so_thuc_te
      FROM lop_hoc_phan
      WHERE mon_hoc_id = ?
        AND ky_hoc_id = ?
      ORDER BY id ASC
      FOR UPDATE
      `,
      [mon_hoc_id, ky_hoc_id],
    );
    const lhpRows = lhpRowsAny as RowDataPacket[];

    if (!lhpRows.length) {
      await conn.rollback();
      return { ok: false, error: "NO_LOP_HOC_PHAN_FOR_THIS_MON_HOC_IN_KY" };
    }

    const sections = (lhpRows as any[]).map((r) => {
      const remaining = Number(r.si_so_toi_da) - Number(r.si_so_thuc_te);
      return {
        lop_hoc_phan_id: Number(r.id),
        remaining: remaining > 0 ? remaining : 0,
      };
    });

    // ✅ tổng sức chứa khả dụng của TẤT CẢ lớp học phần môn đó trong kỳ
    const totalCapacity = sections.reduce((s, x) => s + x.remaining, 0);

    if (totalCapacity <= 0) {
      await conn.commit();
      return {
        ok: true,
        ky_hoc_id,
        mon_hoc_id,
        total_capacity: 0,
        requested_total: requested ?? 0,
        allocated_total: 0,
        allocated_detail: [],
        skipped: { already_registered: 0, not_eligible: 0 },
      };
    }

    // ✅ FIX BUG: check theo TỔNG capacity
    if (requested != null && requested > totalCapacity) {
      await conn.rollback();
      return {
        ok: false,
        error: "SO_LUONG_VUOT_TONG_SI_SO_KHA_DUNG_MON_HOC",
        ky_hoc_id,
        mon_hoc_id,
        requested_total: requested,
        total_capacity: totalCapacity,
        sections,
      };
    }

    const takeCount = requested ?? totalCapacity;

    // Lấy SV ACTIVE chưa đăng ký môn này trong kỳ (ưu tiên id nhỏ)
    const [candidateRowsAny] = await conn.query(
      `
      SELECT sv.id
      FROM sinh_vien sv
      LEFT JOIN (
        SELECT DISTINCT dklhp.sinh_vien_id
        FROM dang_ky_lop_hoc_phan dklhp
        JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
        WHERE lhp.mon_hoc_id = ?
          AND lhp.ky_hoc_id = ?
      ) reg ON reg.sinh_vien_id = sv.id
      WHERE reg.sinh_vien_id IS NULL
        AND sv.trang_thai_id = 1
      ORDER BY sv.id ASC
      `,
      [mon_hoc_id, ky_hoc_id],
    );
    const candidateRows = candidateRowsAny as RowDataPacket[];

    const allCandidates = (candidateRows as any[]).map((r) => Number(r.id));

    // Lọc tiên quyết
    const eligibleAfterPrereq = await filterByPrerequisitesInKy(
      conn,
      mon_hoc_id,
      ky_hoc_id,
      allCandidates,
    );
    const notEligibleCount = allCandidates.length - eligibleAfterPrereq.length;

    // ✅ chỉ lấy đúng TỔNG số cần phân bổ
    const eligible = eligibleAfterPrereq.slice(0, takeCount);

    let ptr = 0;
    let remainingNeed = eligible.length;

    const allocatedDetail: Array<{
      lop_hoc_phan_id: number;
      allocated: number;
      sinh_vien_ids: number[];
    }> = [];

    let allocatedTotal = 0;

    for (const sec of sections) {
      if (sec.remaining <= 0) continue;
      if (remainingNeed <= 0) break;

      const canTake = Math.min(sec.remaining, remainingNeed);
      const takeIds = eligible.slice(ptr, ptr + canTake);
      if (!takeIds.length) break;

      const valuesSql = takeIds
        .map(() => `(?, ?, NOW(), ?, ?, NOW(), NOW())`)
        .join(", ");
      const insertSql = `
        INSERT INTO dang_ky_lop_hoc_phan
          (sinh_vien_id, lop_hoc_phan_id, ngay_dang_ky, trang_thai_id, ghi_chu, created_at, updated_at)
        VALUES ${valuesSql}
      `;

      const insertParams: any[] = [];
      for (const svId of takeIds) {
        insertParams.push(svId, sec.lop_hoc_phan_id, trang_thai_id, ghi_chu);
      }

      const [insAny] = await conn.query(insertSql, insertParams);
      const insertedCount = Number(
        (insAny as ResultSetHeader as any).affectedRows ?? 0,
      );

      if (insertedCount > 0) {
        await conn.query(
          `
          UPDATE lop_hoc_phan
          SET si_so_thuc_te = IFNULL(si_so_thuc_te, 0) + ?,
              updated_at = NOW()
          WHERE id = ?
          `,
          [insertedCount, sec.lop_hoc_phan_id],
        );
      }

      allocatedTotal += insertedCount;
      allocatedDetail.push({
        lop_hoc_phan_id: sec.lop_hoc_phan_id,
        allocated: insertedCount,
        sinh_vien_ids: takeIds.slice(0, insertedCount),
      });

      ptr += canTake;
      remainingNeed -= canTake;
    }

    await conn.commit();

    return {
      ok: true,
      ky_hoc_id,
      mon_hoc_id,
      total_capacity: totalCapacity,
      requested_total: takeCount,
      eligible_total: eligible.length,
      allocated_total: allocatedTotal,
      allocated_detail: allocatedDetail,
      skipped: {
        already_registered: 0,
        not_eligible: notEligibleCount,
      },
    };
  } catch (e: any) {
    await conn.rollback();
    return { ok: false, error: e?.message ?? String(e) };
  } finally {
    conn.release();
  }
}

/** =========================
 *  ✅ 2) BULK: PHÂN BỔ NHIỀU MÔN TRONG KỲ
 *  - so_luong_can_phan_bo áp dụng "mỗi môn" (tổng cho môn đó)
 *  - môn nào fail thì đẩy vào errors, không làm hỏng môn khác
 *  ========================= */
export async function allocateSinhVienToNhieuMonHoc(params: {
  ky_hoc_id: number;
  mon_hoc_ids: number[];
  so_luong_can_phan_bo?: number; // per subject total
  trang_thai_id?: number;
  ghi_chu?: string;
}) {
  const ky_hoc_id = Number(params.ky_hoc_id);
  const mon_hoc_ids = Array.from(
    new Set(
      (params.mon_hoc_ids ?? [])
        .map(Number)
        .filter((x) => Number.isFinite(x) && x > 0),
    ),
  );

  if (!mon_hoc_ids.length) return { ok: false, error: "MON_HOC_IDS_EMPTY" };

  const results: any[] = [];
  const errors: any[] = [];

  for (const mon_hoc_id of mon_hoc_ids) {
    const r = await allocateSinhVienToMonHocInKy({
      ky_hoc_id,
      mon_hoc_id,
      so_luong_can_phan_bo: params.so_luong_can_phan_bo,
      trang_thai_id: params.trang_thai_id,
      ghi_chu: params.ghi_chu,
    });

    if ((r as any).ok) results.push(r);
    else errors.push(r);
  }

  return {
    ok: true,
    ky_hoc_id,
    requested_per_subject: params.so_luong_can_phan_bo ?? null,
    results,
    errors,
  };
}

/** =========================
 *  ✅ 3) AUTO ALL: PHÂN BỔ TẤT CẢ MÔN CÓ LHP TRONG KỲ
 *  ========================= */
export async function allocateSinhVienToAllMonHocInKy(params: {
  ky_hoc_id: number;
  so_luong_can_phan_bo?: number;
  trang_thai_id?: number;
  ghi_chu?: string;
}) {
  const ky_hoc_id = Number(params.ky_hoc_id);

  const [rowsAny] = await pool.query(
    `
    SELECT DISTINCT mon_hoc_id
    FROM lop_hoc_phan
    WHERE ky_hoc_id = ?
    ORDER BY mon_hoc_id ASC
    `,
    [ky_hoc_id],
  );
  const rows = rowsAny as RowDataPacket[];

  const mon_hoc_ids = (rows as any[]).map((r) => Number(r.mon_hoc_id));

  return allocateSinhVienToNhieuMonHoc({
    ky_hoc_id,
    mon_hoc_ids,
    so_luong_can_phan_bo: params.so_luong_can_phan_bo,
    trang_thai_id: params.trang_thai_id,
    ghi_chu: params.ghi_chu,
  });
}
