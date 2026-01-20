import { Request, Response } from "express";
import {
  getSinhVienDaPhanBoLichThiTrongKyService,
  getSinhVienDuDieuKienChuaPhanBoTrongKyService,
} from "../services/lichThiSinhVien.service";

const parseKyHocId = (req: Request): number | null => {
  const kyHocId = Number(req.query.ky_hoc_id);
  if (!kyHocId || Number.isNaN(kyHocId)) return null;
  return kyHocId;
};

export const getSinhVienDaPhanBoLichThiTrongKy = async (
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

    const data = await getSinhVienDaPhanBoLichThiTrongKyService(kyHocId);

    return res.status(200).json({
      status: "success",
      message:
        "Lấy danh sách sinh viên đã được phân bổ lịch thi trong kỳ thành công",
      data,
    });
  } catch (e) {
    console.error("GET_SV_DA_PHAN_BO_ERROR:", e);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi lấy sinh viên đã phân bổ lịch thi trong kỳ",
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
        "Lấy danh sách sinh viên đủ điều kiện (điểm quá trình >= 4) nhưng chưa được phân bổ lịch thi trong kỳ thành công",
      data,
    });
  } catch (e) {
    console.error("GET_SV_DU_DK_CHUA_PB_ERROR:", e);
    return res.status(500).json({
      status: "error",
      message:
        "Lỗi server khi lấy sinh viên đủ điều kiện nhưng chưa phân bổ lịch thi trong kỳ",
    });
  }
};
