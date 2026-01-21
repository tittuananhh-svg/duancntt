import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "../config/database";

/** =========================================================
 *  API 1: GET /api/teacher/lich-thi?ky_hoc_id=...
 *  Lấy lịch thi theo giảng viên (users.id từ token)
 *  JOIN đủ text: lớp HP, môn, phòng, ca, thông tin giảng viên
 *  ========================================================= */

type TeacherLichThiJoinRow = RowDataPacket & {
  id: number;
  ma_lich_thi: string;
  ngay_thi: string;
  ca_hoc_tu: number;
  ca_hoc_toi: number;
  hinh_thuc_thi_id: number;
  ghi_chu: string | null;

  so_luong_toi_da: string | number | null;
  so_luong_da_phan_bo: string | number | null;

  phong_id: number;
  ma_phong: string | null;
  toa_nha: string | null;

  ma_ca_tu: string | null;
  gio_bat_dau: string | null;

  ma_ca_toi: string | null;
  gio_ket_thuc: string | null;

  lop_hoc_phan_id: number;
  ma_lop_hp: string;
  ky_hoc_id: number;

  mon_hoc_id: number | null;
  ma_mon: string | null;
  ten_mon: string | null;
  so_tin_chi: number | null;
  so_tiet_ly_thuyet: number | null;
  so_tiet_thuc_hanh: number | null;

  giang_vien_id: number;
  ma_gv: string | null;
  ho_ten_gv: string | null;
};

export interface TeacherLichThiDTO {
  id: number;
  ma_lich_thi: string;
  ngay_thi: string;

  ca_hoc_tu: number;
  ca_hoc_toi: number;
  ca: {
    ca_tu: { id: number; ma_ca: string | null; gio_bat_dau: string | null };
    ca_toi: { id: number; ma_ca: string | null; gio_ket_thuc: string | null };
  };

  phong: { phong_id: number; ma_phong: string | null; toa_nha: string | null };

  lop_hoc_phan: {
    lop_hoc_phan_id: number;
    ma_lop_hp: string;
    ky_hoc_id: number;
    mon_hoc: {
      mon_hoc_id: number | null;
      ma_mon: string | null;
      ten_mon: string | null;
      so_tin_chi: number | null;
      so_tiet_ly_thuyet: number | null;
      so_tiet_thuc_hanh: number | null;
    };
  };

  giang_vien: {
    giang_vien_id: number;
    ma_gv: string | null;
    ho_ten: string | null;
  };

  hinh_thuc_thi_id: number;
  so_luong_toi_da: number;
  so_luong_da_phan_bo: number;

  ghi_chu: string | null;
}

export const getTeacherLichThiService = async (
  userId: number, // ✅ users.id từ token
  kyHocId?: number,
): Promise<TeacherLichThiDTO[]> => {
  const params: Array<number> = [userId];
  let kyFilter = "";

  if (typeof kyHocId === "number" && !Number.isNaN(kyHocId)) {
    kyFilter = " AND lhp.ky_hoc_id = ? ";
    params.push(kyHocId);
  }

  const [rows] = await pool.query<TeacherLichThiJoinRow[]>(
    `
    SELECT
      lt.id,
      lt.ma_lich_thi,
      lt.ngay_thi,
      lt.ca_hoc_tu,
      lt.ca_hoc_toi,
      lt.hinh_thuc_thi_id,
      lt.ghi_chu,
      lt.so_luong_toi_da,
      lt.so_luong_da_phan_bo,

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

      mh.id AS mon_hoc_id,
      mh.ma_mon,
      mh.ten_mon,
      mh.so_tin_chi,
      mh.so_tiet_ly_thuyet,
      mh.so_tiet_thuc_hanh,

      gv.id AS giang_vien_id,
      gv.ma_gv,
      gv.ho_ten AS ho_ten_gv
    FROM lich_thi lt
    JOIN giang_vien gv ON gv.id = lt.giang_vien
    JOIN lop_hoc_phan lhp ON lhp.id = lt.lop_hoc_phan_id
    LEFT JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
    LEFT JOIN phong_hoc ph ON ph.id = lt.phong_id
    LEFT JOIN ca_hoc ctu ON ctu.id = lt.ca_hoc_tu
    LEFT JOIN ca_hoc ctoi ON ctoi.id = lt.ca_hoc_toi
    WHERE gv.user = ?
    ${kyFilter}
    ORDER BY lt.ngay_thi DESC, ctu.gio_bat_dau ASC
    `,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    ma_lich_thi: r.ma_lich_thi,
    ngay_thi: r.ngay_thi,

    ca_hoc_tu: r.ca_hoc_tu,
    ca_hoc_toi: r.ca_hoc_toi,
    ca: {
      ca_tu: { id: r.ca_hoc_tu, ma_ca: r.ma_ca_tu, gio_bat_dau: r.gio_bat_dau },
      ca_toi: {
        id: r.ca_hoc_toi,
        ma_ca: r.ma_ca_toi,
        gio_ket_thuc: r.gio_ket_thuc,
      },
    },

    phong: { phong_id: r.phong_id, ma_phong: r.ma_phong, toa_nha: r.toa_nha },

    lop_hoc_phan: {
      lop_hoc_phan_id: r.lop_hoc_phan_id,
      ma_lop_hp: r.ma_lop_hp,
      ky_hoc_id: r.ky_hoc_id,
      mon_hoc: {
        mon_hoc_id: r.mon_hoc_id,
        ma_mon: r.ma_mon,
        ten_mon: r.ten_mon,
        so_tin_chi: r.so_tin_chi,
        so_tiet_ly_thuy_thuyet: r.so_tiet_ly_thuyet,
        so_tiet_thuc_hanh: r.so_tiet_thuc_hanh,
      } as any,
    },

    giang_vien: {
      giang_vien_id: r.giang_vien_id,
      ma_gv: r.ma_gv,
      ho_ten: r.ho_ten_gv,
    },

    hinh_thuc_thi_id: r.hinh_thuc_thi_id,
    so_luong_toi_da: Number(r.so_luong_toi_da ?? 0),
    so_luong_da_phan_bo: Number(r.so_luong_da_phan_bo ?? 0),

    ghi_chu: r.ghi_chu,
  }));
};

export interface ChamDiemThiItem {
  sinh_vien_id: number;
  diem_thi: number;
}

export interface ChamDiemThiBulkBody {
  lich_thi_id: number;
  items: ChamDiemThiItem[];
}

type ServiceError = Error & {
  missingAllocatedIds?: number[];
  missingKqhtIds?: number[];
};

type LichThiCoreRow = RowDataPacket & {
  id: number;
  lop_hoc_phan_id: number;
};

export const chamDiemThiBulkService = async (
  userIdFromToken: number, // ✅ users.id
  nguoiNhapId: number, // ✅ users.id
  body: ChamDiemThiBulkBody,
) => {
  const conn: PoolConnection = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Check lịch thi thuộc giảng viên này + lấy lop_hoc_phan_id (LOCK)
    const [ltRows] = await conn.query<LichThiCoreRow[]>(
      `
      SELECT lt.id, lt.lop_hoc_phan_id
      FROM lich_thi lt
      JOIN giang_vien gv ON gv.id = lt.giang_vien
      WHERE lt.id = ?
        AND gv.user = ?
      FOR UPDATE
      `,
      [body.lich_thi_id, userIdFromToken],
    );

    if (ltRows.length === 0) throw new Error("NOT_ALLOWED_OR_NOT_FOUND");

    const lopHocPhanId = ltRows[0].lop_hoc_phan_id;

    // 2) Validate list
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new Error("EMPTY_LIST");
    }

    // dedupe sinh_vien_id: lấy điểm cuối nếu trùng
    const scoreMap = new Map<number, number>();
    for (const it of body.items) {
      const svId = Number(it.sinh_vien_id);
      const diem = Number(it.diem_thi);

      if (!svId || Number.isNaN(svId)) throw new Error("INVALID_STUDENT_ID");
      if (!Number.isFinite(diem) || diem < 0 || diem > 10)
        throw new Error("INVALID_SCORE");

      scoreMap.set(svId, diem);
    }

    const svIds = Array.from(scoreMap.keys());
    if (svIds.length === 0) throw new Error("EMPTY_LIST");

    // 3) Check tất cả SV đã được phân bổ vào lịch thi này
    const placeholders = svIds.map(() => "?").join(", ");
    const [pbRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT sinh_vien_id
      FROM phan_bo_sinh_vien_lich_thi
      WHERE lich_thi_id = ?
        AND sinh_vien_id IN (${placeholders})
      `,
      [body.lich_thi_id, ...svIds],
    );

    const allocatedSet = new Set<number>(
      pbRows.map((r) => Number(r.sinh_vien_id)),
    );
    const missingAllocatedIds = svIds.filter((id) => !allocatedSet.has(id));
    if (missingAllocatedIds.length > 0) {
      const err = new Error("STUDENTS_NOT_ALLOCATED") as ServiceError;
      err.missingAllocatedIds = missingAllocatedIds;
      throw err;
    }

    // 4) Update điểm + tính điểm tổng
    // Rule:
    //  - nếu diem_qua_trinh >= 7 AND diem_thi > diem_qua_trinh => diem_tong = diem_thi
    //  - else => diem_tong = 0.4*diem_qua_trinh + 0.6*diem_thi
    const missingKqhtIds: number[] = [];
    let updatedCount = 0;

    for (const svId of svIds) {
      const diemThi = scoreMap.get(svId)!;

      const [rs] = await conn.query<ResultSetHeader>(
        `
        UPDATE ket_qua_hoc_tap
        SET
          diem_thi = ?,
          diem_tong =
            CASE
              WHEN COALESCE(diem_qua_trinh, 0) >= 7
                   AND ? > COALESCE(diem_qua_trinh, 0)
                THEN ?
              ELSE ROUND(0.4 * COALESCE(diem_qua_trinh, 0) + 0.6 * ?, 2)
            END,
          ngay_nhap_diem = NOW(),
          nguoi_nhap_id = ?,
          updated_at = NOW()
        WHERE sinh_vien_id = ?
          AND lop_hoc_phan_id = ?
        `,
        [
          diemThi, // diem_thi
          diemThi, // compare
          diemThi, // THEN diem_tong = diem_thi
          diemThi, // ELSE ... + 0.6*diem_thi
          nguoiNhapId,
          svId,
          lopHocPhanId,
        ],
      );

      if ((rs.affectedRows ?? 0) === 0) {
        missingKqhtIds.push(svId);
      } else {
        updatedCount += 1;
      }
    }

    if (missingKqhtIds.length > 0) {
      const err = new Error("KQHT_NOT_FOUND_FOR_SOME") as ServiceError;
      err.missingKqhtIds = missingKqhtIds;
      throw err;
    }

    await conn.commit();

    return {
      lich_thi_id: body.lich_thi_id,
      lop_hoc_phan_id: lopHocPhanId,
      updated_count: updatedCount,
      sinh_vien_ids: svIds,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};
