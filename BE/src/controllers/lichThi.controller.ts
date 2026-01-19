import { Request, Response } from "express";
import {
  createLichThiService,
  getLichThiListService,
  CreateLichThiBody,
} from "../services/lichThi.service";

export const createLichThi = async (req: Request, res: Response) => {
  try {
    const {
      ma_lich_thi,
      lop_hoc_phan_id,
      phong_id,
      ngay_thi,
      ca_hoc_tu,
      ca_hoc_toi,
      hinh_thuc_thi_id,
      giang_vien,
      ghi_chu,
    } = req.body as CreateLichThiBody;

    // validate bắt buộc
    if (
      !ma_lich_thi ||
      !lop_hoc_phan_id ||
      !phong_id ||
      !ngay_thi ||
      !ca_hoc_tu ||
      !ca_hoc_toi ||
      !hinh_thuc_thi_id ||
      !giang_vien
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng nhập đầy đủ thông tin lịch thi",
      });
    }

    const created = await createLichThiService({
      ma_lich_thi,
      lop_hoc_phan_id: Number(lop_hoc_phan_id),
      phong_id: Number(phong_id),
      ngay_thi,
      ca_hoc_tu: Number(ca_hoc_tu),
      ca_hoc_toi: Number(ca_hoc_toi),
      hinh_thuc_thi_id: Number(hinh_thuc_thi_id),
      giang_vien: Number(giang_vien),
      ghi_chu: ghi_chu ?? null,
    });

    return res.status(201).json({
      status: "success",
      message: "Tạo lịch thi thành công",
      data: created,
    });
  } catch (e) {
    const err = e as Error;

    if (err.message === "CA_HOC_NOT_FOUND") {
      return res.status(400).json({
        status: "error",
        message: "Ca học không tồn tại",
      });
    }

    if (err.message === "INVALID_CA_RANGE") {
      return res.status(400).json({
        status: "error",
        message: "Khoảng ca thi không hợp lệ (giờ bắt đầu phải < giờ kết thúc)",
      });
    }

    if (err.message === "ROOM_EXAM_CONFLICT") {
      return res.status(409).json({
        status: "error",
        message: "Trùng lịch thi: Phòng thi đã có lịch trong thời điểm này",
      });
    }

    if (err.message === "TEACHER_EXAM_CONFLICT") {
      return res.status(409).json({
        status: "error",
        message:
          "Trùng lịch coi thi: Giảng viên đã có lịch trong thời điểm này",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi tạo lịch thi",
    });
  }
};

export const getLichThiList = async (_req: Request, res: Response) => {
  try {
    const data = await getLichThiListService();

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách lịch thi thành công",
      data,
    });
  } catch {
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi lấy danh sách lịch thi",
    });
  }
};
