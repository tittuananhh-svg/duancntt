import type { Request, Response } from "express";
import { getThoiKhoaBieuSinhVien } from "../services/student.services";

export async function getThoiKhoaBieuSinhVienController(
  req: Request,
  res: Response
) {
  try {
    const { ky_hoc_id, sinh_vien_id } = req.body;

    if (
      ky_hoc_id === undefined ||
      ky_hoc_id === null ||
      Number.isNaN(Number(ky_hoc_id))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id ",
      });
    }

    if (
      sinh_vien_id === undefined ||
      sinh_vien_id === null ||
      Number.isNaN(Number(sinh_vien_id))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền sinh_vien_id ",
      });
    }

    const data = await getThoiKhoaBieuSinhVien({
      ky_hoc_id: Number(ky_hoc_id),
      sinh_vien_id: Number(sinh_vien_id),
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy thời khóa biểu sinh viên thành công",
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
