import type { Request, Response } from "express";
import { forceAllocateSinhVienToLopHocPhan } from "../services/forceAllocate.service";

export async function forceAllocateController(req: Request, res: Response) {
  try {
    const { sinh_vien_id, ma_lop_hp, ky_hoc_id, trang_thai_id, ghi_chu } =
      req.body;

    if (sinh_vien_id == null || Number.isNaN(Number(sinh_vien_id))) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Vui lòng truyền sinh_vien_id (number)",
        });
    }
    if (!ma_lop_hp || String(ma_lop_hp).trim() === "") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Vui lòng truyền ma_lop_hp (string)",
        });
    }
    if (ky_hoc_id == null || Number.isNaN(Number(ky_hoc_id))) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Vui lòng truyền ky_hoc_id (number)",
        });
    }

    const data = await forceAllocateSinhVienToLopHocPhan({
      sinh_vien_id: Number(sinh_vien_id),
      ma_lop_hp: String(ma_lop_hp),
      ky_hoc_id: Number(ky_hoc_id),
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
      ghi_chu: ghi_chu != null ? String(ghi_chu) : undefined,
    });

    return res.status(200).json({
      status: "success",
      message: "Ép cứng phân bổ sinh viên thành công",
      data,
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);

    const map: Record<string, string> = {
      SINH_VIEN_NOT_FOUND: "Không tìm thấy sinh viên",
      SINH_VIEN_NOT_ACTIVE: "Sinh viên không ở trạng thái hoạt động",
      LOP_HOC_PHAN_NOT_FOUND: "Không tìm thấy lớp học phần theo mã và kỳ học",
      LOP_HOC_PHAN_FULL: "Lớp học phần đã đủ sĩ số",
      ALREADY_REGISTERED_LOP_HOC_PHAN: "Sinh viên đã đăng ký lớp học phần này",
      ALREADY_REGISTERED_MON_HOC_IN_KY:
        "Sinh viên đã đăng ký môn học này trong kỳ",
      TIN_CHI_CONFIG_NOT_FOUND: "Chưa cấu hình tín chỉ tối đa cho kỳ học",
      TIN_CHI_CONFIG_DISABLED: "Cấu hình tín chỉ kỳ học đang bị tắt",
      MON_HOC_NOT_FOUND: "Không tìm thấy môn học",
      EXCEED_MAX_CREDITS: "Vượt quá số tín chỉ tối đa của kỳ",
      PREREQUISITE_NOT_SATISFIED: "Sinh viên chưa đạt điều kiện tiên quyết",
    };

    return res.status(400).json({
      status: "error",
      message: map[msg] ?? msg,
    });
  }
}
