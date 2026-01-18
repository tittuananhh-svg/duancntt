import type { Request, Response } from "express";
import {
  allocateSinhVienToMonHocInKy,
  allocateSinhVienToNhieuMonHoc,
  allocateSinhVienToAllMonHocInKy,
} from "../services/allocate.service";

export async function allocateOneMonHocInKyController(
  req: Request,
  res: Response,
) {
  try {
    const {
      ky_hoc_id,
      mon_hoc_id,
      so_luong_can_phan_bo,
      trang_thai_id,
      ghi_chu,
    } = req.body;

    if (ky_hoc_id == null || Number.isNaN(Number(ky_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }
    if (mon_hoc_id == null || Number.isNaN(Number(mon_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền mon_hoc_id (number)",
      });
    }

    const result = await allocateSinhVienToMonHocInKy({
      ky_hoc_id: Number(ky_hoc_id),
      mon_hoc_id: Number(mon_hoc_id),
      so_luong_can_phan_bo:
        so_luong_can_phan_bo != null ? Number(so_luong_can_phan_bo) : undefined,
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
      ghi_chu: ghi_chu != null ? String(ghi_chu) : undefined,
    });

    if (!result.ok) {
      return res
        .status(400)
        .json({ status: "error", message: result.error, data: result });
    }

    return res
      .status(200)
      .json({ status: "success", message: "Phân bổ thành công", data: result });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}

export async function allocateManyMonHocController(
  req: Request,
  res: Response,
) {
  try {
    const {
      ky_hoc_id,
      mon_hoc_ids,
      so_luong_can_phan_bo,
      trang_thai_id,
      ghi_chu,
    } = req.body;

    if (ky_hoc_id == null || Number.isNaN(Number(ky_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }
    if (!Array.isArray(mon_hoc_ids) || mon_hoc_ids.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền mon_hoc_ids (number[])",
      });
    }

    const result = await allocateSinhVienToNhieuMonHoc({
      ky_hoc_id: Number(ky_hoc_id),
      mon_hoc_ids: mon_hoc_ids.map(Number),
      so_luong_can_phan_bo:
        so_luong_can_phan_bo != null ? Number(so_luong_can_phan_bo) : undefined,
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
      ghi_chu: ghi_chu != null ? String(ghi_chu) : undefined,
    });

    // result có thể ok:false nếu cấu hình tín chỉ lỗi
    if ((result as any).ok === false) {
      return res.status(400).json({
        status: "error",
        message: (result as any).error,
        data: result,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Phân bổ theo nhiều môn thành công (môn nào fail xem errors)",
      data: result,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}

export async function allocateAllMonHocInKyController(
  req: Request,
  res: Response,
) {
  try {
    const { ky_hoc_id, so_luong_can_phan_bo, trang_thai_id, ghi_chu } =
      req.body;

    if (ky_hoc_id == null || Number.isNaN(Number(ky_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const result = await allocateSinhVienToAllMonHocInKy({
      ky_hoc_id: Number(ky_hoc_id),
      so_luong_can_phan_bo:
        so_luong_can_phan_bo != null ? Number(so_luong_can_phan_bo) : undefined,
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
      ghi_chu: ghi_chu != null ? String(ghi_chu) : undefined,
    });

    if ((result as any).ok === false) {
      return res.status(400).json({
        status: "error",
        message: (result as any).error,
        data: result,
      });
    }

    return res.status(200).json({
      status: "success",
      message:
        "Phân bổ tất cả môn trong kỳ thành công (môn nào fail xem errors)",
      data: result,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}
