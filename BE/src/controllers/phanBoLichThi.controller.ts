import { Request, Response } from "express";
import { phanBoSinhVienVaoLichThiService } from "../services/phanBoLichThi.service";

export const phanBoSinhVienVaoLichThi = async (req: Request, res: Response) => {
  try {
    const lichThiId = Number(req.params.id);
    if (!lichThiId || Number.isNaN(lichThiId)) {
      return res
        .status(400)
        .json({ status: "error", message: "id lịch thi không hợp lệ" });
    }

    const data = await phanBoSinhVienVaoLichThiService(lichThiId);

    return res.status(200).json({
      status: "success",
      message: "Phân bổ sinh viên vào lịch thi thành công",
      data,
    });
  } catch (e: unknown) {
    console.error("PHAN_BO_ERROR:", e);
    const err = e as { message?: string; code?: string; sqlMessage?: string };

    if (err.message === "LICH_THI_NOT_FOUND")
      return res
        .status(404)
        .json({ status: "error", message: "Không tìm thấy lịch thi" });
    if (err.message === "CAPACITY_FULL")
      return res
        .status(409)
        .json({ status: "error", message: "Đã đạt số lượng tối đa" });
    if (err.message === "NO_ELIGIBLE_STUDENTS")
      return res
        .status(409)
        .json({
          status: "error",
          message: "Không có SV đủ điều kiện (điểm quá trình >= 4)",
        });

    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi phân bổ sinh viên vào lịch thi",
      detail: err.sqlMessage || err.message,
      code: err.code,
    });
  }
};
