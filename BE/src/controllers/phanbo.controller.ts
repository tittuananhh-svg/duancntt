import type { Request, Response } from "express";
import {
  allocateSinhVienToMonHoc,
  getAllSinhVienByKyHoc,
  getSinhVienByMaLopHP,
} from "../services/phanbo.services";

export async function allocateStudentsToMonHoc(req: Request, res: Response) {
  try {
    const { mon_hoc_id, ky_hoc_id, trang_thai_id, ghi_chu } = req.body;

    if (!mon_hoc_id || Number.isNaN(Number(mon_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền mon_hoc_id (number)",
      });
    }

    if (!ky_hoc_id || Number.isNaN(Number(ky_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const result = await allocateSinhVienToMonHoc({
      mon_hoc_id: Number(mon_hoc_id),
      ky_hoc_id: Number(ky_hoc_id),
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
      ghi_chu: ghi_chu != null ? String(ghi_chu) : undefined,
    });

    return res.status(200).json({
      status: "success",
      message: "Phân bổ sinh viên theo môn học thành công",
      data: result,
    });
  } catch (e: any) {
    if (e.message === "MON_HOC_NOT_FOUND") {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy môn học",
      });
    }
    if (e.message === "NO_LOP_HOC_PHAN_FOR_THIS_MON_HOC") {
      return res.status(400).json({
        status: "error",
        message: "Môn học này chưa có lớp học phần để phân bổ",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Lỗi server",
      error: e?.message ?? e,
    });
  }
}

export async function getSinhVienByKyHoc(req: Request, res: Response) {
  try {
    const { ky_hoc_id } = req.body;

    if (!ky_hoc_id || Number.isNaN(Number(ky_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const data = await getAllSinhVienByKyHoc({
      ky_hoc_id: Number(ky_hoc_id),
      only_active_student: true, // sv.trang_thai_id = 1
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách sinh viên theo kỳ học thành công",
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

export async function getSinhVienDaDangKyByMaLopHP(
  req: Request,
  res: Response,
) {
  try {
    const { ma_lop_hp } = req.body;

    if (!ma_lop_hp || String(ma_lop_hp).trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ma_lop_hp",
      });
    }

    const data = await getSinhVienByMaLopHP({
      ma_lop_hp: String(ma_lop_hp).trim(),
      only_active_student: true,
      only_active_registration: false,
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách sinh viên đã đăng ký theo mã học phần thành công",
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
