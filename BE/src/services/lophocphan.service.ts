import { pool } from "../config/database";

export type LichHocItem = {
  thu_trong_tuan: number;
  ca_bat_dau_id: number;
  ca_ket_thuc_id: number;
};

export type CreateLopHocPhanPayload = {
  ma_lop_hp: string;
  mon_hoc_id: number;
  ky_hoc_id: number;
  phong_id: number;
  giang_vien_id: number;

  si_so_toi_da?: number | null;
  si_so_du_kien?: number | null;
  si_so_thuc_te?: number | null;

  lich_hoc: LichHocItem[];
};

export type UpdateLopHocPhanPayload = Partial<{
  mon_hoc_id: number;
  ky_hoc_id: number;
  phong_id: number;
  giang_vien_id: number;

  si_so_toi_da: number | null;
  si_so_du_kien: number | null;
  si_so_thuc_te: number | null;

  trang_thai_id: number;

  // nếu truyền lên => replace toàn bộ lịch học
  lich_hoc: LichHocItem[];
}>;

function isOverlapping(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return !(aEnd < bStart || aStart > bEnd);
}

function validateLichHoc(lich_hoc: LichHocItem[]) {
  if (!Array.isArray(lich_hoc) || lich_hoc.length === 0) {
    throw { status: 400, message: "Thiếu lịch học (lich_hoc)" };
  }

  for (const item of lich_hoc) {
    if (
      item.thu_trong_tuan === undefined ||
      item.ca_bat_dau_id === undefined ||
      item.ca_ket_thuc_id === undefined
    ) {
      throw {
        status: 400,
        message:
          "Mỗi lịch học cần: thu_trong_tuan, ca_bat_dau_id, ca_ket_thuc_id",
      };
    }
    if (item.ca_bat_dau_id > item.ca_ket_thuc_id) {
      throw { status: 400, message: "ca_bat_dau_id phải <= ca_ket_thuc_id" };
    }
  }

  // check payload tự đè ca trong cùng thứ
  for (let i = 0; i < lich_hoc.length; i++) {
    for (let j = i + 1; j < lich_hoc.length; j++) {
      if (lich_hoc[i].thu_trong_tuan === lich_hoc[j].thu_trong_tuan) {
        if (
          isOverlapping(
            lich_hoc[i].ca_bat_dau_id,
            lich_hoc[i].ca_ket_thuc_id,
            lich_hoc[j].ca_bat_dau_id,
            lich_hoc[j].ca_ket_thuc_id,
          )
        ) {
          throw {
            status: 400,
            message: "Lịch học gửi lên bị trùng/đè ca trong cùng một thứ",
          };
        }
      }
    }
  }
}

async function execRows<T>(
  conn: any,
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const [rows] = await (conn as any).execute(sql, params);
  return rows as T[];
}

async function getLichHocByMaLopHP(
  conn: any,
  ma_lop_hp: string,
): Promise<LichHocItem[]> {
  const rows = await execRows<LichHocItem>(
    conn,
    `
      SELECT thu_trong_tuan, ca_bat_dau_id, ca_ket_thuc_id
      FROM thoigianhoc_lophocphan
      WHERE ma_lop_hp = ?
      ORDER BY thu_trong_tuan ASC, ca_bat_dau_id ASC
    `,
    [ma_lop_hp],
  );
  return rows;
}

async function getLopHocPhanRow(conn: any, ma_lop_hp: string) {
  const rows = await execRows<any>(
    conn,
    `SELECT * FROM lop_hoc_phan WHERE ma_lop_hp = ? LIMIT 1`,
    [ma_lop_hp],
  );

  return rows.length ? rows[0] : null;
}

async function checkConflictRoomAndTeacher(
  conn: any,
  params: {
    ky_hoc_id: number;
    phong_id: number;
    giang_vien_id: number;
    lich_hoc: LichHocItem[];
    exclude_ma_lop_hp?: string;
  },
) {
  const { ky_hoc_id, phong_id, giang_vien_id, lich_hoc, exclude_ma_lop_hp } =
    params;

  for (const item of lich_hoc) {
    // trùng phòng
    let roomSql = `
  SELECT lhp.ma_lop_hp, tgh.thu_trong_tuan, tgh.ca_bat_dau_id, tgh.ca_ket_thuc_id
  FROM lop_hoc_phan lhp
  JOIN thoigianhoc_lophocphan tgh ON tgh.ma_lop_hp = lhp.ma_lop_hp
  WHERE lhp.ky_hoc_id = ?
    AND lhp.phong_id = ?
    AND tgh.thu_trong_tuan = ?
    AND NOT (tgh.ca_ket_thuc_id < ? OR tgh.ca_bat_dau_id > ?)
`;

    const roomParams: any[] = [
      ky_hoc_id,
      phong_id,
      item.thu_trong_tuan,
      item.ca_bat_dau_id,
      item.ca_ket_thuc_id,
    ];

    if (exclude_ma_lop_hp) {
      roomSql += ` AND lhp.ma_lop_hp <> ?`;
      roomParams.push(exclude_ma_lop_hp);
    }

    roomSql += ` LIMIT 1`;

    const [roomConflicts] = await conn.execute(roomSql, roomParams);

    if (roomConflicts.length > 0) {
      const c = roomConflicts[0];
      throw {
        status: 409,
        message:
          `Trùng phòng: phong_id=${phong_id} đã có lớp ${c.ma_lop_hp} ` +
          `(thứ ${c.thu_trong_tuan}, ca ${c.ca_bat_dau_id}-${c.ca_ket_thuc_id}) trong học kỳ ${ky_hoc_id}`,
      };
    }

    // trùng giảng viên
    let teacherSql = `
  SELECT lhp.ma_lop_hp, tgh.thu_trong_tuan, tgh.ca_bat_dau_id, tgh.ca_ket_thuc_id
  FROM lop_hoc_phan lhp
  JOIN thoigianhoc_lophocphan tgh ON tgh.ma_lop_hp = lhp.ma_lop_hp
  WHERE lhp.ky_hoc_id = ?
    AND lhp.giang_vien_id = ?
    AND tgh.thu_trong_tuan = ?
    AND NOT (tgh.ca_ket_thuc_id < ? OR tgh.ca_bat_dau_id > ?)
`;

    const teacherParams: any[] = [
      ky_hoc_id,
      giang_vien_id,
      item.thu_trong_tuan,
      item.ca_bat_dau_id,
      item.ca_ket_thuc_id,
    ];

    if (exclude_ma_lop_hp) {
      teacherSql += ` AND lhp.ma_lop_hp <> ?`;
      teacherParams.push(exclude_ma_lop_hp);
    }

    teacherSql += ` LIMIT 1`;

    const [teacherConflicts] = await conn.execute(teacherSql, teacherParams);

    if (teacherConflicts.length > 0) {
      const c = teacherConflicts[0];
      throw {
        status: 409,
        message:
          `Trùng giảng viên: giang_vien_id=${giang_vien_id} đã có lớp ${c.ma_lop_hp} ` +
          `(thứ ${c.thu_trong_tuan}, ca ${c.ca_bat_dau_id}-${c.ca_ket_thuc_id}) trong học kỳ ${ky_hoc_id}`,
      };
    }
  }
}

/** THÊM MỚI PHÂN BỔ (trang_thai_id mặc định 2) */
export async function createPhanBoLopHocPhan(payload: CreateLopHocPhanPayload) {
  const {
    ma_lop_hp,
    mon_hoc_id,
    ky_hoc_id,
    phong_id,
    giang_vien_id,
    si_so_toi_da = null,
    si_so_du_kien = null,
    si_so_thuc_te = null,
    lich_hoc,
  } = payload;

  if (!ma_lop_hp || !mon_hoc_id || !ky_hoc_id || !phong_id || !giang_vien_id) {
    throw {
      status: 400,
      message:
        "Thiếu dữ liệu bắt buộc (ma_lop_hp, mon_hoc_id, ky_hoc_id, phong_id, giang_vien_id)",
    };
  }

  validateLichHoc(lich_hoc);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ✅ 1) Check trùng mã lớp học phần (ma_lop_hp) trước
    const [existRows] = await (conn as any).execute(
      `SELECT ma_lop_hp FROM lop_hoc_phan WHERE ma_lop_hp = ? LIMIT 1`,
      [ma_lop_hp],
    );

    if (Array.isArray(existRows) && existRows.length > 0) {
      throw {
        status: 409,
        message: `Mã lớp học phần đã tồn tại: ${ma_lop_hp}`,
      };
    }

    // ✅ 2) Check trùng phòng/giảng viên theo ca trong học kỳ
    await checkConflictRoomAndTeacher(conn, {
      ky_hoc_id,
      phong_id,
      giang_vien_id,
      lich_hoc,
    });

    // ✅ 3) Insert lop_hoc_phan
    await (conn as any).execute(
      `
        INSERT INTO lop_hoc_phan
          (ma_lop_hp, mon_hoc_id, ky_hoc_id, phong_id, giang_vien_id,
           si_so_toi_da, si_so_du_kien, si_so_thuc_te, trang_thai_id,
           created_at, updated_at)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, 2, NOW(), NOW())
      `,
      [
        ma_lop_hp,
        mon_hoc_id,
        ky_hoc_id,
        phong_id,
        giang_vien_id,
        si_so_toi_da,
        si_so_du_kien,
        si_so_thuc_te,
      ],
    );

    // ✅ 4) Insert lịch học
    for (const item of lich_hoc) {
      await (conn as any).execute(
        `
          INSERT INTO thoigianhoc_lophocphan
            (ma_lop_hp, thu_trong_tuan, ca_bat_dau_id, ca_ket_thuc_id, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, NOW(), NOW())
        `,
        [
          ma_lop_hp,
          item.thu_trong_tuan,
          item.ca_bat_dau_id,
          item.ca_ket_thuc_id,
        ],
      );
    }

    await conn.commit();
    return await getLopHocPhanDetail(ma_lop_hp);
  } catch (e: any) {
    await conn.rollback();

    // ✅ Bắt lỗi trùng UNIQUE (ma_lop_hp)
    if (e?.code === "ER_DUP_ENTRY") {
      // Trường hợp ma_lop_hp UNIQUE bị trùng
      return Promise.reject({
        status: 409,
        message: `Mã lớp học phần đã tồn tại: ${ma_lop_hp}`,
      });
    }

    // ném lại lỗi khác
    throw e;
  } finally {
    conn.release();
  }
}

/** THÔNG TIN (DETAIL) */
export async function getLopHocPhanDetail(ma_lop_hp: string) {
  const conn = await pool.getConnection();
  try {
    const row = await getLopHocPhanRow(conn, ma_lop_hp);
    if (!row) return null;

    const lich_hoc = await getLichHocByMaLopHP(conn, ma_lop_hp);
    return { ...row, lich_hoc };
  } finally {
    conn.release();
  }
}

/** XÓA */
export async function deleteLopHocPhan(ma_lop_hp: string): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `DELETE FROM thoigianhoc_lophocphan WHERE ma_lop_hp = ?`,
      [ma_lop_hp],
    );

    const [rs] = await conn.execute<any>(
      `DELETE FROM lop_hoc_phan WHERE ma_lop_hp = ?`,
      [ma_lop_hp],
    );

    await conn.commit();
    return rs.affectedRows > 0;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** UPDATE PARTIAL - chỉ update field truyền lên */
export async function updateLopHocPhanPartial(
  ma_lop_hp: string,
  payload: UpdateLopHocPhanPayload,
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const current = await getLopHocPhanRow(conn, ma_lop_hp);
    if (!current) {
      await conn.rollback();
      return null;
    }

    const currentLich = await getLichHocByMaLopHP(conn, ma_lop_hp);

    const nextKyHocId = payload.ky_hoc_id ?? current.ky_hoc_id;
    const nextPhongId = payload.phong_id ?? current.phong_id;
    const nextGiangVienId = payload.giang_vien_id ?? current.giang_vien_id;

    const hasLichHocUpdate = payload.lich_hoc !== undefined;
    const lichToCheck = hasLichHocUpdate ? payload.lich_hoc! : currentLich;

    if (hasLichHocUpdate) validateLichHoc(lichToCheck);

    const needCheck =
      hasLichHocUpdate ||
      payload.ky_hoc_id !== undefined ||
      payload.phong_id !== undefined ||
      payload.giang_vien_id !== undefined;

    if (needCheck) {
      await checkConflictRoomAndTeacher(conn, {
        ky_hoc_id: nextKyHocId,
        phong_id: nextPhongId,
        giang_vien_id: nextGiangVienId,
        lich_hoc: lichToCheck,
        exclude_ma_lop_hp: ma_lop_hp,
      });
    }

    const sets: string[] = [];
    const values: any[] = [];

    if (payload.mon_hoc_id !== undefined) {
      sets.push("mon_hoc_id = ?");
      values.push(payload.mon_hoc_id);
    }
    if (payload.ky_hoc_id !== undefined) {
      sets.push("ky_hoc_id = ?");
      values.push(payload.ky_hoc_id);
    }
    if (payload.phong_id !== undefined) {
      sets.push("phong_id = ?");
      values.push(payload.phong_id);
    }
    if (payload.giang_vien_id !== undefined) {
      sets.push("giang_vien_id = ?");
      values.push(payload.giang_vien_id);
    }

    if (payload.si_so_toi_da !== undefined) {
      sets.push("si_so_toi_da = ?");
      values.push(payload.si_so_toi_da);
    }
    if (payload.si_so_du_kien !== undefined) {
      sets.push("si_so_du_kien = ?");
      values.push(payload.si_so_du_kien);
    }
    if (payload.si_so_thuc_te !== undefined) {
      sets.push("si_so_thuc_te = ?");
      values.push(payload.si_so_thuc_te);
    }

    if (payload.trang_thai_id !== undefined) {
      sets.push("trang_thai_id = ?");
      values.push(payload.trang_thai_id);
    }

    const needUpdateParent = sets.length > 0 || hasLichHocUpdate;
    if (needUpdateParent) sets.push("updated_at = NOW()");

    if (sets.length > 0) {
      const sql = `UPDATE lop_hoc_phan SET ${sets.join(", ")} WHERE ma_lop_hp = ?`;
      values.push(ma_lop_hp);
      await conn.execute(sql, values);
    }

    if (hasLichHocUpdate) {
      await conn.execute(
        `DELETE FROM thoigianhoc_lophocphan WHERE ma_lop_hp = ?`,
        [ma_lop_hp],
      );

      for (const item of payload.lich_hoc!) {
        await conn.execute(
          `
            INSERT INTO thoigianhoc_lophocphan
              (ma_lop_hp, thu_trong_tuan, ca_bat_dau_id, ca_ket_thuc_id, created_at, updated_at)
            VALUES
              (?, ?, ?, ?, NOW(), NOW())
          `,
          [
            ma_lop_hp,
            item.thu_trong_tuan,
            item.ca_bat_dau_id,
            item.ca_ket_thuc_id,
          ],
        );
      }
    }

    await conn.commit();
    return await getLopHocPhanDetail(ma_lop_hp);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// 1) Lấy môn học theo kỳ
export async function getMonHocTheoKy(ky_hoc_id: number) {
  const [rows] = await pool.execute<any[]>(
    `
      SELECT
        mh.ma_mon       AS ma_mon,
        mh.ten_mon      AS ten_mon,
        COUNT(lhp.id)   AS so_lich,

        COALESCE(SUM(lhp.si_so_toi_da), 0) AS si_so_toi_da,
        COALESCE(SUM(IFNULL(lhp.si_so_thuc_te, 0)), 0) AS si_so_thuc_te,
        COALESCE(SUM(GREATEST(lhp.si_so_toi_da - IFNULL(lhp.si_so_thuc_te, 0), 0)), 0) AS si_so_kha_dung
      FROM lop_hoc_phan lhp
      JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
      WHERE lhp.ky_hoc_id = ?
      GROUP BY lhp.mon_hoc_id, mh.ma_mon, mh.ten_mon
      ORDER BY mh.ma_mon
    `,
    [ky_hoc_id],
  );
  return rows;
}

// 2) Lấy phòng theo kỳ
export async function getPhongTheoKy(ky_hoc_id: number) {
  const [rows] = await pool.execute<any[]>(
    `
      SELECT DISTINCT
        p.ma_phong AS ma_phong,
        p.suc_chua AS suc_chua_toi_da
      FROM lop_hoc_phan lhp
      JOIN phong_hoc p ON p.id = lhp.phong_id
      WHERE lhp.ky_hoc_id = ?
      ORDER BY p.ma_phong
    `,
    [ky_hoc_id],
  );
  return rows;
}

// 3) Lấy theo mã lớp (danh sách lớp theo kỳ)
export async function getDanhSachLopTheoKy(ky_hoc_id: number) {
  const [rows] = await pool.execute<any[]>(
    `
      SELECT
        lhp.ma_lop_hp AS ma_lop,
        mh.ma_mon     AS ma_mon,
        mh.ten_mon    AS ten_mon,
        CONCAT(gv.ma_gv, '-', gv.ho_ten) AS giang_vien,
        CONCAT(p.ma_phong) AS phong,
        GROUP_CONCAT(
          CONCAT('T', tgh.thu_trong_tuan, '(', tgh.ca_bat_dau_id, '-', tgh.ca_ket_thuc_id, ')')
          ORDER BY tgh.thu_trong_tuan, tgh.ca_bat_dau_id
          SEPARATOR '; '
        ) AS lich,

        lhp.si_so_toi_da AS si_so_toi_da,
        IFNULL(lhp.si_so_thuc_te, 0) AS si_so_thuc_te,
        GREATEST(lhp.si_so_toi_da - IFNULL(lhp.si_so_thuc_te, 0), 0) AS si_so_kha_dung
      FROM lop_hoc_phan lhp
      JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
      JOIN giang_vien gv ON gv.id = lhp.giang_vien_id
      JOIN phong_hoc p ON p.id = lhp.phong_id
      LEFT JOIN thoigianhoc_lophocphan tgh ON tgh.ma_lop_hp = lhp.ma_lop_hp
      WHERE lhp.ky_hoc_id = ?
      GROUP BY
        lhp.ma_lop_hp,
        mh.ma_mon, mh.ten_mon,
        gv.ma_gv, gv.ho_ten,
        p.ma_phong,
        lhp.si_so_toi_da,
        lhp.si_so_thuc_te
      ORDER BY lhp.ma_lop_hp
    `,
    [ky_hoc_id],
  );
  return rows;
}
