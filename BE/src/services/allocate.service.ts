import type {
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { pool } from "../config/database";

type PrereqRow = {
  mon_hoc_tien_quyet_id: number;
  loai_dieu_kien: "qua_mon" | "song_hanh";
  diem_toi_thieu: number | null;
  tin_chi_toi_thieu: number | null;
};

export type AllocateResult =
  | {
      ok: true;
      mon_hoc_id: number;
      ky_hoc_id: number;
      total_capacity: number;
      requested_per_section: number | null;
      allocated_total: number;
      allocated_detail: Array<{
        lop_hoc_phan_id: number;
        allocated: number;
        sinh_vien_ids: number[];
      }>;
      skipped: {
        not_eligible: number;
        over_max_credits: number;
      };
    }
  | {
      ok: false;
      error:
        | "SO_LUONG_CAN_PHAN_BO_INVALID"
        | "SO_LUONG_VUOT_SI_SO_LOP_HOC_PHAN"
        | "KHONG_DU_SINH_VIEN_DU_DIEU_KIEN"
        | "MON_HOC_NOT_FOUND"
        | "NO_LOP_HOC_PHAN_FOR_THIS_MON_HOC_IN_KY"
        | "TIN_CHI_CONFIG_NOT_FOUND"
        | "TIN_CHI_CONFIG_DISABLED";
      message?: string;
      mon_hoc_id?: number;
      ky_hoc_id?: number;
      requested_per_section?: number;
      not_enough_sections?: Array<{
        lop_hoc_phan_id: number;
        remaining: number;
      }>;
      required_total?: number;
      eligible_total?: number;
    };

function chunkArray<T>(arr: T[], size = 500) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function intersect(a: number[], bSet: Set<number>) {
  return a.filter((x) => bSet.has(x));
}

async function getTinChiConfig(ky_hoc_id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT so_tin_chi_toi_da, so_tin_chi_toi_thieu, trang_thai_id
    FROM cau_hinh_tin_chi_ky_hoc
    WHERE ky_hoc_id = ?
    LIMIT 1
    `,
    [ky_hoc_id],
  );

  if (!rows.length) {
    return { ok: false as const, error: "TIN_CHI_CONFIG_NOT_FOUND" as const };
  }

  const r: any = rows[0];
  if (Number(r.trang_thai_id) !== 1) {
    return { ok: false as const, error: "TIN_CHI_CONFIG_DISABLED" as const };
  }

  return {
    ok: true as const,
    max: Number(r.so_tin_chi_toi_da),
    min: r.so_tin_chi_toi_thieu != null ? Number(r.so_tin_chi_toi_thieu) : 0,
  };
}

/** Map: sinh_vien_id -> số tín đã đăng ký trong kỳ (distinct mon_hoc_id) */
async function getRegisteredCreditsMapInKy(
  ky_hoc_id: number,
): Promise<Map<number, number>> {
  const mp = new Map<number, number>();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT t.sinh_vien_id, SUM(mh.so_tin_chi) AS so_tin
    FROM (
      SELECT DISTINCT dklhp.sinh_vien_id, lhp.mon_hoc_id
      FROM dang_ky_lop_hoc_phan dklhp
      JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
      WHERE lhp.ky_hoc_id = ?
    ) t
    JOIN mon_hoc mh ON mh.id = t.mon_hoc_id
    GROUP BY t.sinh_vien_id
    `,
    [ky_hoc_id],
  );

  for (const r of rows as any[]) {
    mp.set(Number(r.sinh_vien_id), Number(r.so_tin ?? 0));
  }

  return mp;
}

async function getPassedStudentIdsForCourse(
  conn: PoolConnection,
  monHocId: number,
  candidateIds: number[],
  diemToiThieu: number | null,
): Promise<Set<number>> {
  const ok = new Set<number>();
  if (!candidateIds.length) return ok;

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

    const [rows] = await conn.query<RowDataPacket[]>(sql, params);
    for (const r of rows as any[]) ok.add(Number(r.sinh_vien_id));
  }

  return ok;
}

async function getCurrentlyRegisteredStudentIdsForCourseInKy(
  conn: PoolConnection,
  monHocId: number,
  kyHocId: number,
  candidateIds: number[],
): Promise<Set<number>> {
  const ok = new Set<number>();
  if (!candidateIds.length) return ok;

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

    const [rows] = await conn.query<RowDataPacket[]>(sql, params);
    for (const r of rows as any[]) ok.add(Number(r.sinh_vien_id));
  }

  return ok;
}

async function getStudentsMeetingMinCredits(
  conn: PoolConnection,
  minCredits: number,
  candidateIds: number[],
): Promise<Set<number>> {
  const ok = new Set<number>();
  if (!candidateIds.length) return ok;

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
    const [rows] = await conn.query<RowDataPacket[]>(sql, params);
    for (const r of rows as any[]) ok.add(Number(r.sinh_vien_id));
  }

  return ok;
}

async function filterByPrerequisites(
  conn: PoolConnection,
  monHocId: number,
  kyHocId: number,
  candidateIds: number[],
): Promise<number[]> {
  const [prereqRows] = await conn.query<RowDataPacket[]>(
    `
      SELECT mon_hoc_tien_quyet_id, loai_dieu_kien, diem_toi_thieu, tin_chi_toi_thieu
      FROM mon_hoc_tien_quyet
      WHERE mon_hoc_id = ?
    `,
    [monHocId],
  );

  if (!prereqRows.length) return candidateIds;

  let current = candidateIds.slice();

  for (const pr of prereqRows as any as PrereqRow[]) {
    if (!current.length) break;

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

async function allocateOneMonHocInKyUsingMap(params: {
  mon_hoc_id: number;
  ky_hoc_id: number;
  trang_thai_id: number;
  ghi_chu: string;
  configMin: number;
  configMax: number;
  creditMap: Map<number, number>;
  so_luong_can_phan_bo?: number;
}): Promise<AllocateResult> {
  const {
    mon_hoc_id,
    ky_hoc_id,
    trang_thai_id,
    ghi_chu,
    configMin,
    configMax,
    creditMap,
    so_luong_can_phan_bo,
  } = params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [mhRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, so_tin_chi FROM mon_hoc WHERE id = ? LIMIT 1`,
      [mon_hoc_id],
    );
    if (!mhRows.length) {
      await conn.rollback();
      return { ok: false, error: "MON_HOC_NOT_FOUND", mon_hoc_id, ky_hoc_id };
    }
    const soTinMon = Number((mhRows as any[])[0].so_tin_chi);

    const [lhpRows] = await conn.query<RowDataPacket[]>(
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

    if (!lhpRows.length) {
      await conn.rollback();
      return {
        ok: false,
        error: "NO_LOP_HOC_PHAN_FOR_THIS_MON_HOC_IN_KY",
        mon_hoc_id,
        ky_hoc_id,
      };
    }

    const sections = (lhpRows as any[]).map((r) => {
      const remaining = Number(r.si_so_toi_da) - Number(r.si_so_thuc_te);
      return {
        lop_hoc_phan_id: Number(r.id),
        remaining: remaining > 0 ? remaining : 0,
      };
    });

    const totalCapacity = sections.reduce((s, x) => s + x.remaining, 0);

    let requestedPerSection: number | null = null;
    if (so_luong_can_phan_bo != null) {
      const n = Number(so_luong_can_phan_bo);
      if (!Number.isFinite(n) || n <= 0) {
        await conn.rollback();
        return {
          ok: false,
          error: "SO_LUONG_CAN_PHAN_BO_INVALID",
          mon_hoc_id,
          ky_hoc_id,
        };
      }
      requestedPerSection = n;

      const notEnough = sections
        .filter((s) => s.remaining < n)
        .map((s) => ({
          lop_hoc_phan_id: s.lop_hoc_phan_id,
          remaining: s.remaining,
        }));

      if (notEnough.length) {
        await conn.rollback();
        return {
          ok: false,
          error: "SO_LUONG_VUOT_SI_SO_LOP_HOC_PHAN",
          mon_hoc_id,
          ky_hoc_id,
          requested_per_section: n,
          not_enough_sections: notEnough,
        };
      }
    }
    const [candidateRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT sv.id
      FROM sinh_vien sv
      WHERE sv.trang_thai_id = 1
        AND NOT EXISTS (
          SELECT 1
          FROM dang_ky_lop_hoc_phan dklhp
          JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
          WHERE dklhp.sinh_vien_id = sv.id
            AND lhp.mon_hoc_id = ?
            AND lhp.ky_hoc_id = ?
        )
      ORDER BY sv.id ASC
      `,
      [mon_hoc_id, ky_hoc_id],
    );

    const candidates0 = (candidateRows as any[]).map((r) => Number(r.id));

    const candidates1 = candidates0.filter((id) => {
      const cur = creditMap.get(id) ?? 0;
      return cur + soTinMon <= configMax;
    });
    const overMaxCount = candidates0.length - candidates1.length;

    const needMin: number[] = [];
    const others: number[] = [];
    for (const id of candidates1) {
      const cur = creditMap.get(id) ?? 0;
      if (cur < configMin) needMin.push(id);
      else others.push(id);
    }
    const orderedCandidates = [...needMin, ...others];

    const eligibleAfterPrereq = await filterByPrerequisites(
      conn,
      mon_hoc_id,
      ky_hoc_id,
      orderedCandidates,
    );
    const notEligibleCount =
      orderedCandidates.length - eligibleAfterPrereq.length;

    let willAllocateTotal = Math.min(totalCapacity, eligibleAfterPrereq.length);

    if (requestedPerSection != null) {
      willAllocateTotal = requestedPerSection * sections.length;

      if (eligibleAfterPrereq.length < willAllocateTotal) {
        await conn.rollback();
        return {
          ok: false,
          error: "KHONG_DU_SINH_VIEN_DU_DIEU_KIEN",
          mon_hoc_id,
          ky_hoc_id,
          requested_per_section: requestedPerSection,
          required_total: willAllocateTotal,
          eligible_total: eligibleAfterPrereq.length,
        };
      }
    }

    if (willAllocateTotal <= 0) {
      await conn.commit();
      return {
        ok: true,
        mon_hoc_id,
        ky_hoc_id,
        total_capacity: totalCapacity,
        requested_per_section: requestedPerSection,
        allocated_total: 0,
        allocated_detail: [],
        skipped: {
          not_eligible: notEligibleCount,
          over_max_credits: overMaxCount,
        },
      };
    }

    const eligible = eligibleAfterPrereq.slice(0, willAllocateTotal);

    let ptr = 0;
    let allocatedTotal = 0;
    const allocatedDetail: AllocateResult extends { ok: true }
      ? AllocateResult["allocated_detail"]
      : any[] = [];

    for (const sec of sections) {
      const takeCount =
        requestedPerSection != null ? requestedPerSection : sec.remaining;
      if (takeCount <= 0) continue;
      if (ptr >= eligible.length) break;

      const takeIds = eligible.slice(ptr, ptr + takeCount);
      if (!takeIds.length) break;

      let insertedTotalForSection = 0;

      for (const part of chunkArray(takeIds, 300)) {
        const valuesSql = part
          .map(() => `(?, ?, NOW(), ?, ?, NOW(), NOW())`)
          .join(", ");
        const insertSql = `
          INSERT INTO dang_ky_lop_hoc_phan
            (sinh_vien_id, lop_hoc_phan_id, ngay_dang_ky, trang_thai_id, ghi_chu, created_at, updated_at)
          VALUES ${valuesSql}
        `;

        const insertParams: any[] = [];
        for (const svId of part)
          insertParams.push(svId, sec.lop_hoc_phan_id, trang_thai_id, ghi_chu);

        const [ins] = await conn.query<ResultSetHeader>(
          insertSql,
          insertParams,
        );
        insertedTotalForSection += ins.affectedRows;
      }

      if (insertedTotalForSection > 0) {
        await conn.query<ResultSetHeader>(
          `
          UPDATE lop_hoc_phan
          SET si_so_thuc_te = IFNULL(si_so_thuc_te, 0) + ?,
              updated_at = NOW()
          WHERE id = ?
          `,
          [insertedTotalForSection, sec.lop_hoc_phan_id],
        );
      }

      allocatedTotal += insertedTotalForSection;
      allocatedDetail.push({
        lop_hoc_phan_id: sec.lop_hoc_phan_id,
        allocated: insertedTotalForSection,
        sinh_vien_ids: takeIds.slice(0, insertedTotalForSection),
      });

      ptr += takeIds.length;
    }

    await conn.commit();

    if (allocatedTotal > 0) {
      for (const d of allocatedDetail) {
        for (const svId of d.sinh_vien_ids) {
          const cur = creditMap.get(svId) ?? 0;
          creditMap.set(svId, cur + soTinMon);
        }
      }
    }

    return {
      ok: true,
      mon_hoc_id,
      ky_hoc_id,
      total_capacity: totalCapacity,
      requested_per_section: requestedPerSection,
      allocated_total: allocatedTotal,
      allocated_detail: allocatedDetail,
      skipped: {
        not_eligible: notEligibleCount,
        over_max_credits: overMaxCount,
      },
    };
  } catch (e: any) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** API #1: phân bổ 1 môn trong kỳ */
export async function allocateSinhVienToMonHocInKy(params: {
  mon_hoc_id: number;
  ky_hoc_id: number;
  trang_thai_id?: number;
  ghi_chu?: string;
  so_luong_can_phan_bo?: number; // số SV / mỗi LHP
}): Promise<AllocateResult> {
  const cfg = await getTinChiConfig(params.ky_hoc_id);
  if (!cfg.ok)
    return {
      ok: false,
      error: cfg.error,
      mon_hoc_id: params.mon_hoc_id,
      ky_hoc_id: params.ky_hoc_id,
    };

  const creditMap = await getRegisteredCreditsMapInKy(params.ky_hoc_id);

  return allocateOneMonHocInKyUsingMap({
    mon_hoc_id: params.mon_hoc_id,
    ky_hoc_id: params.ky_hoc_id,
    trang_thai_id: params.trang_thai_id ?? 1,
    ghi_chu: params.ghi_chu ?? "PHAN_BO_TU_DONG",
    configMin: cfg.min,
    configMax: cfg.max,
    creditMap,
    so_luong_can_phan_bo: params.so_luong_can_phan_bo,
  });
}

/** API #2: phân bổ nhiều môn trong kỳ */
export async function allocateSinhVienToNhieuMonHoc(params: {
  ky_hoc_id: number;
  mon_hoc_ids: number[];
  trang_thai_id?: number;
  ghi_chu?: string;
  so_luong_can_phan_bo?: number; // số SV / mỗi LHP (áp dụng cho mỗi môn)
}) {
  const cfg = await getTinChiConfig(params.ky_hoc_id);
  if (!cfg.ok) {
    return { ok: false, error: cfg.error, ky_hoc_id: params.ky_hoc_id };
  }

  const creditMap = await getRegisteredCreditsMapInKy(params.ky_hoc_id);
  const uniqueMonHocIds = Array.from(
    new Set(params.mon_hoc_ids.map(Number)),
  ).filter((x) => x > 0);

  const results: AllocateResult[] = [];
  const errors: Array<{ mon_hoc_id: number; error: string; detail: any }> = [];

  for (const mon_hoc_id of uniqueMonHocIds) {
    try {
      const r = await allocateOneMonHocInKyUsingMap({
        mon_hoc_id,
        ky_hoc_id: params.ky_hoc_id,
        trang_thai_id: params.trang_thai_id ?? 1,
        ghi_chu: params.ghi_chu ?? "PHAN_BO_TU_DONG",
        configMin: cfg.min,
        configMax: cfg.max,
        creditMap,
        so_luong_can_phan_bo: params.so_luong_can_phan_bo,
      });

      if (r.ok) results.push(r);
      else errors.push({ mon_hoc_id, error: r.error, detail: r });
    } catch (e: any) {
      errors.push({ mon_hoc_id, error: e?.message ?? String(e), detail: null });
    }
  }

  return {
    ok: true,
    ky_hoc_id: params.ky_hoc_id,
    config: { so_tin_chi_toi_thieu: cfg.min, so_tin_chi_toi_da: cfg.max },
    requested_per_section: params.so_luong_can_phan_bo ?? null,
    processed: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/** API #3: truyền ky_hoc_id -> tự phân bổ tất cả môn có LHP trong kỳ */
export async function allocateSinhVienToAllMonHocInKy(params: {
  ky_hoc_id: number;
  trang_thai_id?: number;
  ghi_chu?: string;
  so_luong_can_phan_bo?: number; // số SV / mỗi LHP
}) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT DISTINCT mon_hoc_id
    FROM lop_hoc_phan
    WHERE ky_hoc_id = ?
    ORDER BY mon_hoc_id ASC
    `,
    [params.ky_hoc_id],
  );

  const monHocIds = (rows as any[]).map((r) => Number(r.mon_hoc_id));

  return allocateSinhVienToNhieuMonHoc({
    ky_hoc_id: params.ky_hoc_id,
    mon_hoc_ids: monHocIds,
    trang_thai_id: params.trang_thai_id,
    ghi_chu: params.ghi_chu,
    so_luong_can_phan_bo: params.so_luong_can_phan_bo,
  });
}
