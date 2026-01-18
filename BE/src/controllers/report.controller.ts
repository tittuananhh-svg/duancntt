import type { Request, Response } from "express";
import { getSinhVienThieuTinChiTrongKy } from "../services/report.service";

function q1(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

export async function getSinhVienThieuTinChiController(
  req: Request,
  res: Response,
) {
  try {
    const ky_hoc_id_raw = q1(req.query.ky_hoc_id);
    const ky_hoc_id = Number(ky_hoc_id_raw);

    if (ky_hoc_id_raw == null || Number.isNaN(ky_hoc_id)) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Vui lòng truyền ky_hoc_id (number)",
        });
    }

    const result = await getSinhVienThieuTinChiTrongKy(ky_hoc_id);

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách sinh viên thiếu tín chỉ tối thiểu thành công",
      data: result,
    });
  } catch (e: any) {
    return res.status(400).json({ status: "error", message: e?.message ?? e });
  }
}
