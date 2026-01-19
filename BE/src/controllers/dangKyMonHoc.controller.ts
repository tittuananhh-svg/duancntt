import type { Request, Response } from "express";
import { getSinhVienDaDangKyTrongKy } from "../services/dangKyMonHoc.service";

function parseMonHocIds(q: any): number[] | undefined {
  if (q == null || q === "") return undefined;

  // hỗ trợ: mon_hoc_ids=1,2,3 hoặc mon_hoc_ids[]=1&mon_hoc_ids[]=2
  const arr = Array.isArray(q) ? q : String(q).split(",");
  const ids = arr
    .map((x) => Number(String(x).trim()))
    .filter((x) => Number.isFinite(x) && x > 0);

  return ids.length ? Array.from(new Set(ids)) : undefined;
}

export async function getSinhVienDaDangKyTrongKyController(
  req: Request,
  res: Response,
) {
  try {
    const ky_hoc_id = Number(req.query.ky_hoc_id);
    if (Number.isNaN(ky_hoc_id)) {
      return res.status(400).json({
        status: "error",
        message: "Vui lòng truyền ky_hoc_id (number)",
      });
    }

    const mon_hoc_ids = parseMonHocIds(req.query.mon_hoc_ids);

    const data = await getSinhVienDaDangKyTrongKy({
      ky_hoc_id,
      mon_hoc_ids,
    });

    return res.status(200).json({
      status: "success",
      message: "Lấy danh sách sinh viên đã đăng ký trong kỳ thành công",
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
