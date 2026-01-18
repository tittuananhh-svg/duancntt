import type {
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { pool } from "../config/database";

/** util */
function chunkArray<T>(arr: T[], size = 500) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type PrereqRow = {
  mon_hoc_tien_quyet_id: number;
  loai_dieu_kien: "qua_mon" | "song_hanh";
  diem_toi_thieu: number | null;
  tin_chi_toi_thieu: number | null;
};

async function getTinChiConfig(conn: PoolConnection, ky_hoc_id: number) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT so_tin_chi_toi_da, so_tin_chi_toi_thieu, trang_thai_id
    FROM cau_hinh_tin_chi_ky_hoc
    WHERE ky_hoc_id = ?
    LIMIT 1
    `,
    [ky_hoc_id],
  );

  if (!rows.length) throw new Error("TIN_CHI_CONFIG_NOT_FOUND");
  const r: any = rows[0];
  if (Number(r.trang_thai_id) !== 1) throw new Error("TIN_CHI_CONFIG_DISABLED");

  return {
    max: Number(r.so_tin_chi_toi_da),
    min: r.so_tin_chi_toi_thieu != null ? Number(r.so_tin_chi_toi_thieu) : 0,
  };
}

async function getRegisteredCreditsOfStudentInKy(
  conn: PoolConnection,
  ky_hoc_id: number,
  sinh_vien_id: number,
) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT IFNULL(SUM(mh.so_tin_chi), 0) AS so_tin
    FROM (
      SELECT DISTINCT lhp.mon_hoc_id
      FROM dang_ky_lop_hoc_phan dklhp
      JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
      WHERE lhp.ky_hoc_id = ?
        AND dklhp.sinh_vien_id = ?
    ) t
    JOIN mon_hoc mh ON mh.id = t.mon_hoc_id
    `,
    [ky_hoc_id, sinh_vien_id],
  );

  const r: any = rows[0];
  return Number(r?.so_tin ?? 0);
}

async function getPassedForCourse(
  conn: PoolConnection,
  monHocId: number,
  sinh_vien_id: number,
  diemToiThieu: number | null,
) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM ket_qua_hoc_tap kq
    JOIN lop_hoc_phan lhp ON lhp.id = kq.lop_hoc_phan_id
    WHERE lhp.mon_hoc_id = ?
      AND kq.sinh_vien_id = ?
      AND kq.xep_loai_id <= 4
      ${diemToiThieu != null ? "AND kq.diem_tong >= ?" : ""}
    LIMIT 1
    `,
    diemToiThieu != null
      ? [monHocId, sinh_vien_id, diemToiThieu]
      : [monHocId, sinh_vien_id],
  );

  return rows.length > 0;
}

async function getRegisteredForCourseInKy(
  conn: PoolConnection,
  monHocId: number,
  ky_hoc_id: number,
  sinh_vien_id: number,
) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM dang_ky_lop_hoc_phan dklhp
    JOIN lop_hoc_phan lhp ON lhp.id = dklhp.lop_hoc_phan_id
    WHERE lhp.mon_hoc_id = ?
      AND lhp.ky_hoc_id = ?
      AND dklhp.sinh_vien_id = ?
    LIMIT 1
    `,
    [monHocId, ky_hoc_id, sinh_vien_id],
  );
  return rows.length > 0;
}

async function getStudentsMeetingMinCreditsSingle(
  conn: PoolConnection,
  minCredits: number,
  sinh_vien_id: number,
) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM (
      SELECT DISTINCT kq.sinh_vien_id, lhp.mon_hoc_id
      FROM ket_qua_hoc_tap kq
      JOIN lop_hoc_phan lhp ON lhp.id = kq.lop_hoc_phan_id
      WHERE kq.xep_loai_id <= 4
        AND kq.sinh_vien_id = ?
    ) t
    JOIN mon_hoc mh ON mh.id = t.mon_hoc_id
    GROUP BY t.sinh_vien_id
    HAVING SUM(mh.so_tin_chi) >= ?
    LIMIT 1
    `,
    [sinh_vien_id, minCredits],
  );
  return rows.length > 0;
}

async function checkPrerequisitesForStudent(
  conn: PoolConnection,
  mon_hoc_id: number,
  ky_hoc_id: number,
  sinh_vien_id: number,
) {
  const [prereqRows] = await conn.query<RowDataPacket[]>(
    `
      SELECT mon_hoc_tien_quyet_id, loai_dieu_kien, diem_toi_thieu, tin_chi_toi_thieu
      FROM mon_hoc_tien_quyet
      WHERE mon_hoc_id = ?
    `,
    [mon_hoc_id],
  );

  if (!prereqRows.length) return true;

  for (const pr of prereqRows as any as PrereqRow[]) {
    let satisfied = false;

    if (pr.loai_dieu_kien === "qua_mon") {
      satisfied = await getPassedForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        sinh_vien_id,
        pr.diem_toi_thieu,
      );
    } else {
      const passed = await getPassedForCourse(
        conn,
        pr.mon_hoc_tien_quyet_id,
        sinh_vien_id,
        pr.diem_toi_thieu,
      );
      const registered = await getRegisteredForCourseInKy(
        conn,
        pr.mon_hoc_tien_quyet_id,
        ky_hoc_id,
        sinh_vien_id,
      );
      satisfied = passed || registered;
    }

    if (!satisfied) return false;

    if (pr.tin_chi_toi_thieu != null) {
      const okCredits = await getStudentsMeetingMinCreditsSingle(
        conn,
        pr.tin_chi_toi_thieu,
        sinh_vien_id,
      );
      if (!okCredits) return false;
    }
  }

  return true;
}

/**
 * ÉP CỨNG: truyền sinh_vien_id + ma_lop_hp + ky_hoc_id
 * -> tự thêm dang_ky_lop_hoc_phan + update si_so_thuc_te
 */
export async function forceAllocateSinhVienToLopHocPhan(params: {
  sinh_vien_id: number;
  ma_lop_hp: string;
  ky_hoc_id: number;
  trang_thai_id?: number;
  ghi_chu?: string;
}) {
  const { sinh_vien_id, ma_lop_hp, ky_hoc_id } = params;
  const trang_thai_id = params.trang_thai_id ?? 1;
  const ghi_chu = params.ghi_chu ?? "EP_CUNG";

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Check sinh viên tồn tại + active
    const [svRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, trang_thai_id FROM sinh_vien WHERE id = ? LIMIT 1`,
      [sinh_vien_id],
    );
    if (!svRows.length) throw new Error("SINH_VIEN_NOT_FOUND");
    if (Number((svRows as any[])[0].trang_thai_id) !== 1)
      throw new Error("SINH_VIEN_NOT_ACTIVE");

    // 2) Lấy lớp học phần theo mã + kỳ (lock)
    const [lhpRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT id, mon_hoc_id, si_so_toi_da, IFNULL(si_so_thuc_te,0) AS si_so_thuc_te
      FROM lop_hoc_phan
      WHERE ma_lop_hp = ?
        AND ky_hoc_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ma_lop_hp, ky_hoc_id],
    );
    if (!lhpRows.length) throw new Error("LOP_HOC_PHAN_NOT_FOUND");

    const lhp: any = lhpRows[0];
    const lop_hoc_phan_id = Number(lhp.id);
    const mon_hoc_id = Number(lhp.mon_hoc_id);
    const remaining = Number(lhp.si_so_toi_da) - Number(lhp.si_so_thuc_te);
    if (remaining <= 0) throw new Error("LOP_HOC_PHAN_FULL");

    // 3) Check đã đăng ký LHP này chưa
    const [dupLhp] = await conn.query<RowDataPacket[]>(
      `SELECT 1 FROM dang_ky_lop_hoc_phan WHERE sinh_vien_id = ? AND lop_hoc_phan_id = ? LIMIT 1`,
      [sinh_vien_id, lop_hoc_phan_id],
    );
    if (dupLhp.length) throw new Error("ALREADY_REGISTERED_LOP_HOC_PHAN");

    // 4) Check đã đăng ký môn này trong kỳ chưa (tránh trùng môn khác LHP)
    const [dupMon] = await conn.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM dang_ky_lop_hoc_phan dklhp
      JOIN lop_hoc_phan lhp2 ON lhp2.id = dklhp.lop_hoc_phan_id
      WHERE dklhp.sinh_vien_id = ?
        AND lhp2.mon_hoc_id = ?
        AND lhp2.ky_hoc_id = ?
      LIMIT 1
      `,
      [sinh_vien_id, mon_hoc_id, ky_hoc_id],
    );
    if (dupMon.length) throw new Error("ALREADY_REGISTERED_MON_HOC_IN_KY");

    // 5) Check tín chỉ tối đa kỳ
    const cfg = await getTinChiConfig(conn, ky_hoc_id);

    const [mhRows] = await conn.query<RowDataPacket[]>(
      `SELECT so_tin_chi FROM mon_hoc WHERE id = ? LIMIT 1`,
      [mon_hoc_id],
    );
    if (!mhRows.length) throw new Error("MON_HOC_NOT_FOUND");
    const soTinMon = Number((mhRows as any[])[0].so_tin_chi);

    const currentCredits = await getRegisteredCreditsOfStudentInKy(
      conn,
      ky_hoc_id,
      sinh_vien_id,
    );
    if (currentCredits + soTinMon > cfg.max) {
      throw new Error("EXCEED_MAX_CREDITS");
    }

    // 6) Check tiên quyết
    const okPrereq = await checkPrerequisitesForStudent(
      conn,
      mon_hoc_id,
      ky_hoc_id,
      sinh_vien_id,
    );
    if (!okPrereq) throw new Error("PREREQUISITE_NOT_SATISFIED");

    // 7) Insert đăng ký
    await conn.query<ResultSetHeader>(
      `
      INSERT INTO dang_ky_lop_hoc_phan
        (sinh_vien_id, lop_hoc_phan_id, ngay_dang_ky, trang_thai_id, ghi_chu, created_at, updated_at)
      VALUES
        (?, ?, NOW(), ?, ?, NOW(), NOW())
      `,
      [sinh_vien_id, lop_hoc_phan_id, trang_thai_id, ghi_chu],
    );

    // 8) Update sĩ số
    await conn.query<ResultSetHeader>(
      `
      UPDATE lop_hoc_phan
      SET si_so_thuc_te = IFNULL(si_so_thuc_te, 0) + 1,
          updated_at = NOW()
      WHERE id = ?
      `,
      [lop_hoc_phan_id],
    );

    await conn.commit();

    return {
      sinh_vien_id,
      ky_hoc_id,
      ma_lop_hp,
      lop_hoc_phan_id,
      mon_hoc_id,
      so_tin_da_dang_ky_truoc: currentCredits,
      so_tin_sau_dang_ky: currentCredits + soTinMon,
      max_tin_chi_ky: cfg.max,
    };
  } catch (e: any) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
