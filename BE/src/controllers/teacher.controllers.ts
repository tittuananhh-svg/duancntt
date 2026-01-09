import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/authGuard";
import {
  getThoiKhoaBieuGiangVienByUser,
  getGiangVienMeByUserId,
} from "../services/teacher.services";

function q1(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

export async function getThoiKhoaBieuGiangVienController(
  req: Request,
  res: Response
) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Chưa đăng nhập hoặc thiếu token" });
    }

    const ky_hoc_id_raw = q1(req.query.ky_hoc_id);
    const ky_hoc_id = Number(ky_hoc_id_raw);

    if (ky_hoc_id_raw == null || Number.isNaN(ky_hoc_id)) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const data = await getThoiKhoaBieuGiangVienByUser({
      user_id: userId,
      ky_hoc_id,
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy thời khóa biểu giảng viên thành công",
      data,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}

export async function getMeGiangVienController(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Chưa đăng nhập hoặc thiếu token" });
    }

    const data = await getGiangVienMeByUserId(userId);

    if (!data) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy thông tin giảng viên",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Lấy thông tin giảng viên thành công",
      data,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}
