import type { Request, Response } from "express";
import {
  getBangDiemSinhVienTrongKy,
  getBangDiemSinhVienToanBo,
} from "../services/bangDiemSinhVien.service";

// GET /api/student/bang-diem?ky_hoc_id=2
export async function getBangDiemTrongKyByTokenController(
  req: Request,
  res: Response,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Chưa đăng nhập hoặc thiếu token" });
    }

    const ky_hoc_id = Number(req.query.ky_hoc_id);
    if (Number.isNaN(ky_hoc_id)) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const data = await getBangDiemSinhVienTrongKy({
      user_id: Number(userId),
      ky_hoc_id,
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy bảng điểm trong kỳ thành công",
      data,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}

// GET /api/student/bang-diem/toan-bo
export async function getBangDiemToanBoByTokenController(
  req: Request,
  res: Response,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Chưa đăng nhập hoặc thiếu token" });
    }

    const data = await getBangDiemSinhVienToanBo({
      user_id: Number(userId),
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy toàn bộ bảng điểm thành công",
      data,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}
