import { Request, Response } from "express";
import {
  createGiangVien,
  deleteGiangVien,
  getGiangVienById,
  searchGiangVien,
  updateGiangVien,
} from "../services/giangvien.service";

// GET /giang-vien?q=keyword
export async function getListGiangVien(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || "";
    const data = await searchGiangVien(q);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// GET /giang-vien/:id
export async function getOneGiangVien(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const gv = await getGiangVienById(id);

    if (!gv) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giảng viên" });
    }

    res.json({ success: true, data: gv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// POST /giang-vien
export async function createGiangVienHandler(req: Request, res: Response) {
  try {
    const {
      ma_gv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      gioi_tinh_id,
      ngay_sinh,
      hoc_ham,
      hoc_vi,
      user,
    } = req.body;

    if (!ma_gv || !ho_ten) {
      return res.status(400).json({
        success: false,
        message: "ma_gv và ho_ten là bắt buộc",
      });
    }

    const gv = await createGiangVien({
      ma_gv,
      ho_ten,
      email: email ?? null,
      sdt: sdt ?? null,
      khoa_id: khoa_id ? Number(khoa_id) : null,
      gioi_tinh_id: gioi_tinh_id ? Number(gioi_tinh_id) : null,
      ngay_sinh: ngay_sinh || null,
      hoc_ham: hoc_ham ?? null,
      hoc_vi: hoc_vi ?? null,
      user: user ?? null,
    });

    res.status(201).json({ success: true, data: gv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// PUT /giang-vien/:id
export async function updateGiangVienHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const existed = await getGiangVienById(id);

    if (!existed) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giảng viên" });
    }

    const {
      ma_gv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      gioi_tinh_id,
      ngay_sinh,
      hoc_ham,
      hoc_vi,
      user,
    } = req.body;

    const gv = await updateGiangVien(id, {
      ma_gv: ma_gv ?? existed.ma_gv,
      ho_ten: ho_ten ?? existed.ho_ten,
      email: email !== undefined ? email : existed.email,
      sdt: sdt !== undefined ? sdt : existed.sdt,
      khoa_id:
        khoa_id !== undefined ? (khoa_id ? Number(khoa_id) : null) : existed.khoa_id,
      gioi_tinh_id:
        gioi_tinh_id !== undefined
          ? (gioi_tinh_id ? Number(gioi_tinh_id) : null)
          : existed.gioi_tinh_id,
      ngay_sinh:
        ngay_sinh !== undefined ? ngay_sinh : (existed.ngay_sinh as any),
      hoc_ham: hoc_ham !== undefined ? hoc_ham : existed.hoc_ham,
      hoc_vi: hoc_vi !== undefined ? hoc_vi : existed.hoc_vi,
      user: user !== undefined ? user : existed.user,
    });

    res.json({ success: true, data: gv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// DELETE /giang-vien/:id
export async function deleteGiangVienHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const ok = await deleteGiangVien(id);

    if (!ok) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giảng viên" });
    }

    res.json({ success: true, message: "Xoá giảng viên thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}
