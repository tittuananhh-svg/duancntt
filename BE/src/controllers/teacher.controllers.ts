import type { Request, Response } from "express";
import { getThoiKhoaBieuGiangVien } from "../services/teacher.services";

export async function getThoiKhoaBieuGiangVienController(
  req: Request,
  res: Response
) {
  try {
    const { giang_vien_id, ky_hoc_id } = req.body;

    if (
      giang_vien_id === undefined ||
      giang_vien_id === null ||
      Number.isNaN(Number(giang_vien_id))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền giang_vien_id (number)",
      });
    }

    if (
      ky_hoc_id === undefined ||
      ky_hoc_id === null ||
      Number.isNaN(Number(ky_hoc_id))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const data = await getThoiKhoaBieuGiangVien({
      giang_vien_id: Number(giang_vien_id),
      ky_hoc_id: Number(ky_hoc_id),
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy thời khóa biểu giảng viên thành công",
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
