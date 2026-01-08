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

function chunkArray<T>(arr: T[], size = 500) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function intersect(a: number[], bSet: Set<number>) {
  return a.filter((x) => bSet.has(x));
}

async function getPassedStudentIdsForCourse(
  conn: PoolConnection,
  monHocId: number,
  candidateIds: number[],
  diemToiThieu: number | null
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
    for (const r of rows) ok.add(Number(r.sinh_vien_id));
  }

  return ok;
}

async function getCurrentlyRegisteredStudentIdsForCourse(
  conn: PoolConnection,
  monHocId: number,
  candidateIds: number[]
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
        AND dklhp.sinh_vien_id IN (${placeholders})
    `;

    const params: any[] = [monHocId, ...part];
    const [rows] = await conn.query<RowDataPacket[]>(sql, params);
    for (const r of rows) ok.add(Number(r.sinh_vien_id));
  }

  return ok;
}

async function getStudentsMeetingMinCredits(
  conn: PoolConnection,
  minCredits: number,
  candidateIds: number[]
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
    for (const r of rows) ok.add(Number(r.sinh_vien_id));
  }

  return ok;
}

async function filterByPrerequisites(
  conn: PoolConnection,
  monHocId: number,
  candidateIds: number[]
): Promise<number[]> {
  if (!candidateIds.length) return [];

  const [prereqRows] = await conn.query<RowDataPacket[]>(
    `
    SELECT mon_hoc_tien_quyet_id, loai_dieu_kien, diem_toi_thieu, tin_chi_toi_thieu
    FROM mon_hoc_tien_quyet
    WHERE mon_hoc_id = ?
    `,
    [monHocId]
  );

  if (!prereqRows.length) return candidateIds;

  let current = candidateIds.slice();

  for (const pr of prereqRows as unknown as PrereqRow[]) {
    if (!current.length) break;

    let satisfied = new Set<number>();

    if (pr.loai_dieu_kien === "qua_mon") {
      satisfied = await getPassedStudentIdsForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        current,
        pr.diem_toi_thieu
      );
    }

    if (pr.loai_dieu_kien === "song_hanh") {
      const passed = await getPassedStudentIdsForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        current,
        pr.diem_toi_thieu
      );
      const registered = await getCurrentlyRegisteredStudentIdsForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        current
      );
      satisfied = new Set<number>([...passed, ...registered]);
    }

    if (pr.tin_chi_toi_thieu != null) {
      const okCredits = await getStudentsMeetingMinCredits(
        conn,
        pr.tin_chi_toi_thieu,
        current
      );

      const next = new Set<number>();
      for (const id of satisfied) if (okCredits.has(id)) next.add(id);
      satisfied = next;
    }

    current = intersect(current, satisfied);
  }

  return current;
}

export async function allocateSinhVienToMonHoc(params: {
  mon_hoc_id: number;
  ky_hoc_id: number;
  trang_thai_id?: number; // trang_thai_id cho dang_ky_lop_hoc_phan
  ghi_chu?: string;
}) {
  const { mon_hoc_id, ky_hoc_id } = params;
  const trang_thai_id = params.trang_thai_id ?? 1;
  const ghi_chu = params.ghi_chu ?? "PHAN_BO_TU_DONG";

  const conn: PoolConnection = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check môn học tồn tại
    const [mh] = await conn.query<RowDataPacket[]>(
      `SELECT id FROM mon_hoc WHERE id = ?`,
      [mon_hoc_id]
    );
    if (!mh.length) throw new Error("MON_HOC_NOT_FOUND");

    // 1) Lock LHP theo môn + kỳ
    const [lhpRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT id, si_so_toi_da, IFNULL(si_so_thuc_te, 0) AS si_so_thuc_te
      FROM lop_hoc_phan
      WHERE mon_hoc_id = ?
        AND ky_hoc_id = ?
      ORDER BY id ASC
      FOR UPDATE
      `,
      [mon_hoc_id, ky_hoc_id]
    );

    if (!lhpRows.length)
      throw new Error("NO_LOP_HOC_PHAN_FOR_THIS_MON_HOC_AND_KY");

    const sections = lhpRows.map((r) => {
      const remaining = Number(r.si_so_toi_da) - Number(r.si_so_thuc_te);
      return {
        lop_hoc_phan_id: Number(r.id),
        remaining: remaining > 0 ? remaining : 0,
      };
    });

    const totalCapacity = sections.reduce((s, x) => s + x.remaining, 0);

    if (totalCapacity <= 0) {
      await conn.commit();
      return {
        mon_hoc_id,
        ky_hoc_id,
        total_capacity: 0,
        allocated_total: 0,
        allocated_detail: [],
        skipped: { already_registered: 0, not_eligible: 0 },
      };
    }

    // 2) Lấy danh sách SV chưa đăng ký môn này TRONG kỳ này + SV phải trang_thai_id = 1
    const [candidateRows] = await conn.query<RowDataPacket[]>(
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
      [mon_hoc_id, ky_hoc_id]
    );

    const allCandidates = candidateRows.map((r) => Number(r.id));
    const alreadyRegisteredCount = 0;

    // 3) Lọc theo điều kiện tiên quyết
    const eligibleAfterPrereq = await filterByPrerequisites(
      conn,
      mon_hoc_id,
      allCandidates
    );

    const notEligibleCount = allCandidates.length - eligibleAfterPrereq.length;
    const eligible = eligibleAfterPrereq.slice(0, totalCapacity);

    let ptr = 0;
    let allocatedTotal = 0;

    const allocatedDetail: Array<{
      lop_hoc_phan_id: number;
      allocated: number;
      sinh_vien_ids: number[];
    }> = [];

    for (const sec of sections) {
      if (sec.remaining <= 0) continue;
      if (ptr >= eligible.length) break;

      const takeIds = eligible.slice(ptr, ptr + sec.remaining);
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

      const [ins] = await conn.query<ResultSetHeader>(insertSql, insertParams);
      const insertedCount = ins.affectedRows;

      if (insertedCount > 0) {
        await conn.query<ResultSetHeader>(
          `
          UPDATE lop_hoc_phan
          SET si_so_thuc_te = IFNULL(si_so_thuc_te, 0) + ?,
              updated_at = NOW()
          WHERE id = ?
          `,
          [insertedCount, sec.lop_hoc_phan_id]
        );
      }

      allocatedTotal += insertedCount;

      allocatedDetail.push({
        lop_hoc_phan_id: sec.lop_hoc_phan_id,
        allocated: insertedCount,
        sinh_vien_ids: takeIds.slice(0, insertedCount),
      });

      ptr += takeIds.length;
    }

    await conn.commit();

    return {
      mon_hoc_id,
      ky_hoc_id,
      total_capacity: totalCapacity,
      allocated_total: allocatedTotal,
      allocated_detail: allocatedDetail,
      skipped: {
        already_registered: alreadyRegisteredCount,
        not_eligible: notEligibleCount,
      },
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

type StudentAllocationRow = {
  ma_sv: string;
  ho_ten: string;
  ma_lop_hp: string;
  ma_mon: string;
  ten_mon: string;
  so_tin_chi: number;
};

export async function getAllSinhVienByKyHoc(params: {
  ky_hoc_id: number;
  only_active_student?: boolean; // nếu muốn lọc sv.trang_thai_id = 1
}) {
  const { ky_hoc_id } = params;
  const onlyActive = params.only_active_student ?? true;

  const sql = `
    SELECT
      sv.ma_sv,
      sv.ho_ten,
      lhp.ma_lop_hp,
      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    WHERE lhp.ky_hoc_id = ?
      ${onlyActive ? "AND sv.trang_thai_id = 1" : ""}
    ORDER BY sv.id ASC, mh.id ASC, lhp.id ASC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [ky_hoc_id]);

  return (rows as unknown as StudentAllocationRow[]).map((r) => ({
    ma_sv: r.ma_sv,
    ho_ten: r.ho_ten,
    ma_lop_hp: r.ma_lop_hp,
    ma_mon: r.ma_mon,
    ten_mon: r.ten_mon,
    so_tin_chi: Number(r.so_tin_chi),
  }));
}

export async function getSinhVienByMaLopHP(params: {
  ma_lop_hp: string;
  only_active_student?: boolean; // sv.trang_thai_id = 1
  only_active_registration?: boolean; // dklhp.trang_thai_id = 1 (nếu bạn dùng)
}) {
  const { ma_lop_hp } = params;
  const onlyActiveStudent = params.only_active_student ?? true;
  const onlyActiveReg = params.only_active_registration ?? false;

  const sql = `
    SELECT
      sv.ma_sv,
      sv.ho_ten,
      lhp.ma_lop_hp,
      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN sinh_vien sv ON sv.id = dklhp.sinh_vien_id
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    WHERE lhp.ma_lop_hp = ?
      ${onlyActiveStudent ? "AND sv.trang_thai_id = 1" : ""}
      ${onlyActiveReg ? "AND dklhp.trang_thai_id = 1" : ""}
    ORDER BY sv.id ASC
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [ma_lop_hp]);

  return (rows as unknown as StudentAllocationRow[]).map((r) => ({
    ma_sv: r.ma_sv,
    ho_ten: r.ho_ten,
    ma_lop_hp: r.ma_lop_hp,
    ma_mon: r.ma_mon,
    ten_mon: r.ten_mon,
    so_tin_chi: Number(r.so_tin_chi),
  }));
}
