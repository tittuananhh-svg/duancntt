import type { Request, Response } from "express";
import {
  createKeHoachThi,
  listKeHoachThi,
  updateKeHoachThi,
} from "../services/kehoachthi.service";

export async function listKeHoachThiController(req: Request, res: Response) {
  try {
    const { ky_hoc_id, mon_hoc_id, trang_thai_id } = req.body;

    const data = await listKeHoachThi({
      ky_hoc_id: ky_hoc_id != null ? Number(ky_hoc_id) : undefined,
      mon_hoc_id: mon_hoc_id != null ? Number(mon_hoc_id) : undefined,
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách kế hoạch thi thành công",
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

export async function createKeHoachThiController(req: Request, res: Response) {
  try {
    const { ky_hoc_id, mon_hoc_id, mo_ta, ngay_bat_dau, ngay_ket_thuc } =
      req.body;
    console.log(req.body);
    console.log(ky_hoc_id);

    if (
      ky_hoc_id === undefined ||
      ky_hoc_id === null ||
      Number.isNaN(Number(ky_hoc_id))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    if (!mon_hoc_id || Number.isNaN(Number(mon_hoc_id))) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền mon_hoc_id (number)",
      });
    }

    const data = await createKeHoachThi({
      ky_hoc_id: Number(ky_hoc_id),
      mon_hoc_id: Number(mon_hoc_id),
      mo_ta: mo_ta != null ? String(mo_ta) : undefined,
      ngay_bat_dau: ngay_bat_dau != null ? String(ngay_bat_dau) : undefined,
      ngay_ket_thuc: ngay_ket_thuc != null ? String(ngay_ket_thuc) : undefined,
    });

    return res.status(201).json({
      status: "success",
      message: "Tạo kế hoạch thi thành công (trang_thai_id mặc định = 1)",
      data,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}

export async function updateKeHoachThiController(req: Request, res: Response) {
  try {
    const {
      id,
      ky_hoc_id,
      mon_hoc_id,
      mo_ta,
      ngay_bat_dau,
      ngay_ket_thuc,
      trang_thai_id,
    } = req.body;

    if (!id || Number.isNaN(Number(id))) {
      return res
        .status(400)
        .json({ status: "error", message: "Vui lòng truyền id (number)" });
    }

    const data = await updateKeHoachThi({
      id: Number(id),
      ky_hoc_id: ky_hoc_id != null ? Number(ky_hoc_id) : undefined,
      mon_hoc_id: mon_hoc_id != null ? Number(mon_hoc_id) : undefined,
      mo_ta:
        mo_ta !== undefined
          ? mo_ta === null
            ? null
            : String(mo_ta)
          : undefined,
      ngay_bat_dau:
        ngay_bat_dau !== undefined
          ? ngay_bat_dau === null
            ? null
            : String(ngay_bat_dau)
          : undefined,
      ngay_ket_thuc:
        ngay_ket_thuc !== undefined
          ? ngay_ket_thuc === null
            ? null
            : String(ngay_ket_thuc)
          : undefined,
      trang_thai_id: trang_thai_id != null ? Number(trang_thai_id) : undefined,
    });

    return res.status(200).json({
      status: "success",
      message: "Cập nhật kế hoạch thi thành công",
      data,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ status: "error", message: "Lỗi server", error: e?.message ?? e });
  }
}
