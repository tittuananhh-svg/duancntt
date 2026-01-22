import { Response } from "express";
import { AuthRequest } from "../middlewares/authGuard";
import { getStudentLichThiService } from "../services/studentExam.service";

export const getStudentLichThi = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // ✅ users.id từ token
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

    const data = await getStudentLichThiService(Number(userId), kyHocId);

    return res.status(200).json({
      status: "success",
      message: "Lấy lịch thi sinh viên thành công",
      data,
    });
  } catch (e) {
    console.error("GET_STUDENT_LICH_THI_ERROR:", e);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi lấy lịch thi sinh viên",
    });
  }
};
