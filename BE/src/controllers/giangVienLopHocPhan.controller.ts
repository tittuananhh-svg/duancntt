import type { Request, Response } from "express";
import {
  getDanhSachLopHocPhanCuaGiangVienByUserId,
  getAllSinhVienTrongLopHocPhan,
} from "../services/giangVienLopHocPhan.service";

export async function getDanhSachLopHocPhanCuaGiangVienController(
  req: Request,
  res: Response,
) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Chưa đăng nhập hoặc thiếu token",
      });
    }

    const data = await getDanhSachLopHocPhanCuaGiangVienByUserId(
      Number(userId),
    );

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách lớp học phần của giảng viên thành công",
      data,
    });
  } catch (e: any) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: e?.message ?? e,
    });
  }
}

function q1(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

export async function getAllSinhVienTrongLopHocPhanController(
  req: Request,
  res: Response,
) {
  try {
    const lop_hoc_phan_id_raw = q1(req.query.lop_hoc_phan_id);
    const lop_hoc_phan_id = Number(lop_hoc_phan_id_raw);

    if (lop_hoc_phan_id_raw == null || Number.isNaN(lop_hoc_phan_id)) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền lop_hoc_phan_id (number)",
      });
    }

    const data = await getAllSinhVienTrongLopHocPhan({ lop_hoc_phan_id });

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách sinh viên trong lớp học phần thành công",
      data,
    });
  } catch (e: any) {
    return res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: e?.message ?? e,
    });
  }
}
