import { Request, Response } from "express";
import {
  createLichThiService,
  getLichThiListService,
  CreateLichThiBody,
} from "../services/lichThi.service";

export const createLichThi = async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateLichThiBody;

    const requiredFields: Array<keyof CreateLichThiBody> = [
      "ma_lich_thi",
      "lop_hoc_phan_id",
      "phong_id",
      "ngay_thi",
      "ca_hoc_tu",
      "ca_hoc_toi",
      "hinh_thuc_thi_id",
      "giang_vien",
      "so_luong_toi_da",
    ];

    for (const f of requiredFields) {
      if (
        body[f] === undefined ||
        body[f] === null ||
        body[f] === ("" as never)
      ) {
        return res.status(400).json({
          status: "error",
          message: `Thiếu trường bắt buộc: ${String(f)}`,
        });
      }
    }

    const created = await createLichThiService({
      ma_lich_thi: String(body.ma_lich_thi),
      lop_hoc_phan_id: Number(body.lop_hoc_phan_id),
      phong_id: Number(body.phong_id),
      ngay_thi: String(body.ngay_thi),
      ca_hoc_tu: Number(body.ca_hoc_tu),
      ca_hoc_toi: Number(body.ca_hoc_toi),
      hinh_thuc_thi_id: Number(body.hinh_thuc_thi_id),
      giang_vien: Number(body.giang_vien),
      so_luong_toi_da: Number(body.so_luong_toi_da),
      ghi_chu: body.ghi_chu ?? null,
    });

    return res.status(201).json({
      status: "success",
      message: "Tạo lịch thi thành công",
      data: created,
    });
  } catch (e: unknown) {
    console.error("CREATE_LICH_THI_ERROR:", e);

    const err = e as {
      message?: string;
      code?: string;
      errno?: number;
      sqlMessage?: string;
    };

    // các lỗi bạn đã throw trong service
    if (err.message === "CA_HOC_NOT_FOUND") {
      return res
        .status(400)
        .json({ status: "error", message: "Ca học không tồn tại" });
    }
    if (err.message === "INVALID_CA_RANGE") {
      return res
        .status(400)
        .json({ status: "error", message: "Khoảng ca thi không hợp lệ" });
    }
    if (err.message === "INVALID_CAPACITY") {
      return res
        .status(400)
        .json({ status: "error", message: "Số lượng tối đa không hợp lệ" });
    }
    if (err.message === "ROOM_EXAM_CONFLICT") {
      return res
        .status(409)
        .json({
          status: "error",
          message: "Trùng lịch: Phòng thi đã có lịch trong thời điểm này",
        });
    }
    if (err.message === "TEACHER_EXAM_CONFLICT") {
      return res
        .status(409)
        .json({
          status: "error",
          message:
            "Trùng lịch: Giảng viên coi thi đã có lịch trong thời điểm này",
        });
    }

    // lỗi MySQL hay gặp
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Trùng dữ liệu (có thể ma_lich_thi bị trùng)",
        detail: err.sqlMessage,
      });
    }

    if (
      err.code === "ER_NO_REFERENCED_ROW_2" ||
      err.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      return res.status(400).json({
        status: "error",
        message: "Lỗi khóa ngoại (ID liên kết không tồn tại)",
        detail: err.sqlMessage,
      });
    }

    if (err.code === "ER_BAD_FIELD_ERROR" || err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({
        status: "error",
        message: "Sai tên cột hoặc thiếu bảng trong câu SQL",
        detail: err.sqlMessage,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi tạo lịch thi",
      detail: err.sqlMessage || err.message,
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
