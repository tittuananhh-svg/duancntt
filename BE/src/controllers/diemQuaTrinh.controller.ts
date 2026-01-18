import type { Request, Response } from "express";
import { upsertDiemQuaTrinh } from "../services/diemQuaTrinh.service";

export async function upsertDiemQuaTrinhController(
  req: Request,
  res: Response,
) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ status: "error", message: "Chưa đăng nhập hoặc thiếu token" });
    }

    const { lop_hoc_phan_id, items, sinh_vien_id, diem_qua_trinh } = req.body;

    if (lop_hoc_phan_id == null || Number.isNaN(Number(lop_hoc_phan_id))) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Vui lòng truyền lop_hoc_phan_id (number)",
        });
    }

    // Cho phép truyền 1 SV hoặc nhiều SV
    let normalizedItems: Array<{
      sinh_vien_id: number;
      diem_qua_trinh: number;
    }> = [];

    if (Array.isArray(items) && items.length) {
      normalizedItems = items.map((x: any) => ({
        sinh_vien_id: Number(x.sinh_vien_id),
        diem_qua_trinh: Number(x.diem_qua_trinh),
      }));
    } else if (sinh_vien_id != null && diem_qua_trinh != null) {
      normalizedItems = [
        {
          sinh_vien_id: Number(sinh_vien_id),
          diem_qua_trinh: Number(diem_qua_trinh),
        },
      ];
    } else {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền items[] hoặc (sinh_vien_id, diem_qua_trinh)",
      });
    }

    const data = await upsertDiemQuaTrinh({
      userId: Number(userId),
      lop_hoc_phan_id: Number(lop_hoc_phan_id),
      items: normalizedItems,
    });

    return res
      .status(200)
      .json({
        status: "success",
        message: "Cập nhật điểm quá trình thành công",
        data,
      });
  } catch (e: any) {
    const msg = e?.message ?? String(e);

    const map: Record<string, string> = {
      ITEMS_EMPTY: "Danh sách items rỗng hoặc không hợp lệ",
      LOP_HOC_PHAN_NOT_FOUND_OR_FORBIDDEN:
        "Lớp học phần không tồn tại hoặc không thuộc giảng viên",
    };

    return res.status(400).json({ status: "error", message: map[msg] ?? msg });
  }
}
