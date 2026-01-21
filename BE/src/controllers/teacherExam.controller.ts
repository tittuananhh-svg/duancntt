import { Response } from "express";
import { AuthRequest } from "../middlewares/authGuard";
import {
  chamDiemThiBulkService,
  getTeacherLichThiService,
  ChamDiemThiBulkBody,
} from "../services/teacherExam.service";

/** GET /api/teacher/lich-thi?ky_hoc_id= */
export const getTeacherLichThi = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ users.id
    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Token không hợp lệ" });
    }

    const kyHocIdRaw = req.query.ky_hoc_id as string | undefined;
    let kyHocId: number | undefined;

    if (kyHocIdRaw !== undefined) {
      const parsed = Number(kyHocIdRaw);
      if (!parsed || Number.isNaN(parsed)) {
        return res
          .status(400)
          .json({ status: "error", message: "ky_hoc_id không hợp lệ" });
      }
      kyHocId = parsed;
    }

    const data = await getTeacherLichThiService(Number(userId), kyHocId);

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách lịch thi của giảng viên thành công",
      data,
    });
  } catch (e) {
    console.error("GET_TEACHER_LICH_THI_ERROR:", e);
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server khi lấy lịch thi" });
  }
};

/** POST /api/teacher/lich-thi/cham-diem  body: { lich_thi_id, items: [...] } */
export const chamDiemThiBulk = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ users.id
    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Token không hợp lệ" });
    }

    const body = req.body as Partial<ChamDiemThiBulkBody>;
    const lichThiId = Number(body.lich_thi_id);

    if (!lichThiId || Number.isNaN(lichThiId)) {
      return res
        .status(400)
        .json({ status: "error", message: "lich_thi_id không hợp lệ" });
    }
    if (!Array.isArray(body.items)) {
      return res
        .status(400)
        .json({ status: "error", message: "items phải là mảng" });
    }

    const data = await chamDiemThiBulkService(Number(userId), Number(userId), {
      lich_thi_id: lichThiId,
      items: body.items.map((x) => ({
        sinh_vien_id: Number((x as { sinh_vien_id: unknown }).sinh_vien_id),
        diem_thi: Number((x as { diem_thi: unknown }).diem_thi),
      })),
    });

    return res.status(200).json({
      status: "success",
      message: "Chấm điểm thi thành công",
      data,
    });
  } catch (e: unknown) {
    console.error("CHAM_DIEM_THI_BULK_ERROR:", e);

    const err = e as {
      message?: string;
      code?: string;
      sqlMessage?: string;
      missingAllocatedIds?: number[];
      missingKqhtIds?: number[];
    };

    if (err.message === "EMPTY_LIST") {
      return res
        .status(400)
        .json({ status: "error", message: "Danh sách items rỗng" });
    }
    if (err.message === "INVALID_STUDENT_ID") {
      return res.status(400).json({
        status: "error",
        message: "Có sinh_vien_id không hợp lệ trong list",
      });
    }
    if (err.message === "INVALID_SCORE") {
      return res.status(400).json({
        status: "error",
        message: "Có điểm thi không hợp lệ (0-10) trong list",
      });
    }
    if (err.message === "NOT_ALLOWED_OR_NOT_FOUND") {
      return res.status(403).json({
        status: "error",
        message:
          "Bạn không có quyền chấm điểm lịch thi này (hoặc lịch thi không tồn tại)",
      });
    }
    if (err.message === "STUDENTS_NOT_ALLOCATED") {
      return res.status(409).json({
        status: "error",
        message: "Có sinh viên chưa được phân bổ vào lịch thi này",
        data: { missingAllocatedIds: err.missingAllocatedIds ?? [] },
      });
    }
    if (err.message === "KQHT_NOT_FOUND_FOR_SOME") {
      return res.status(404).json({
        status: "error",
        message:
          "Không tìm thấy kết quả học tập cho một số sinh viên trong lớp học phần",
        data: { missingKqhtIds: err.missingKqhtIds ?? [] },
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi chấm điểm thi (bulk)",
      detail: err.sqlMessage || err.message,
      code: err.code,
    });
  }
};
