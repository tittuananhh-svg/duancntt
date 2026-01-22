import { Request, Response } from "express";
import {
  getSinhVienDaPhanBoTrongKyService,
  getSinhVienDuDieuKienChuaPhanBoTrongKyService,
} from "../services/lichThiSinhVien.service";

const parseKyHocId = (req: Request): number | null => {
  const kyHocRaw = req.query.ky_hoc_id as string | undefined;
  const kyHocId = kyHocRaw ? Number(kyHocRaw) : NaN;

  if (!kyHocRaw || Number.isNaN(kyHocId) || kyHocId <= 0) return null;
  return kyHocId;
};

export const getSinhVienDaPhanBoTrongKy = async (
  req: Request,
  res: Response,
) => {
  try {
    const kyHocId = parseKyHocId(req);
    if (!kyHocId) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id hợp lệ",
      });
    }

    const data = await getSinhVienDaPhanBoTrongKyService(kyHocId);

    return res.status(200).json({
      status: "success",
      message:
        "Lấy danh sách sinh viên đã phân bổ lịch thi trong kỳ thành công",
      data, // ✅ mảng phẳng
    });
  } catch (e) {
    console.error("GET_SV_DA_PHAN_BO_ERROR:", e);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi lấy danh sách sinh viên đã phân bổ",
    });
  }
};

export const getSinhVienDuDieuKienChuaPhanBoTrongKy = async (
  req: Request,
  res: Response,
) => {
  try {
    const kyHocId = parseKyHocId(req);
    if (!kyHocId) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id hợp lệ",
      });
    }

    const data = await getSinhVienDuDieuKienChuaPhanBoTrongKyService(kyHocId);

    return res.status(200).json({
      status: "success",
      message:
        "Lấy danh sách sinh viên đủ điều kiện nhưng chưa phân bổ lịch thi trong kỳ thành công",
      data, // ✅ mảng phẳng
    });
  } catch (e) {
    console.error("GET_SV_DU_DK_CHUA_PHAN_BO_ERROR:", e);
    return res.status(500).json({
      status: "error",
      message:
        "Lỗi server khi lấy danh sách sinh viên đủ điều kiện nhưng chưa phân bổ",
    });
  }
};
