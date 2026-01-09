import { Request, Response } from "express";
import {
  createSinhVien,
  deleteSinhVien,
  getSinhVienById,
  searchSinhVien,
  updateSinhVien,
} from "../services/sinhvien.service";

// GET /sinh-vien?q=keyword  → danh sách + search
export async function getListSinhVien(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || "";
    const data = await searchSinhVien(q);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// GET /sinh-vien/:id       → chi tiết 1 sinh viên
export async function getOneSinhVien(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const sv = await getSinhVienById(id);
    if (!sv) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sinh viên" });
    }
    res.json({ success: true, data: sv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// POST /sinh-vien          → thêm mới
export async function createSinhVienHandler(req: Request, res: Response) {
  try {
    const {
      ma_sv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      lop_nien_che,
      gioi_tinh_id,
      ngay_sinh,
      user,
    } = req.body;

    if (!ma_sv || !ho_ten) {
      return res.status(400).json({
        success: false,
        message: "ma_sv và ho_ten là bắt buộc",
      });
    }

    const sv = await createSinhVien({
      ma_sv,
      ho_ten,
      email: email ?? null,
      sdt: sdt ?? null,
      khoa_id: khoa_id ? Number(khoa_id) : null,
      lop_nien_che: lop_nien_che ?? null,
      gioi_tinh_id: gioi_tinh_id ? Number(gioi_tinh_id) : null,
      ngay_sinh: ngay_sinh || null,
    });

    return res.status(201).json({ success: true, data: sv });
  } catch (err: any) {
    if (err?.message === "EMAIL_EXISTS") {
      return res
        .status(409)
        .json({ success: false, message: "Email đã tồn tại trong hệ thống" });
    }
    if (err?.message === "USERNAME_EXISTS") {
      return res
        .status(409)
        .json({
          success: false,
          message: "Mã sinh viên đã tồn tại trong hệ thống",
        });
    }

    console.error(err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// PUT /sinh-vien/:id       → cập nhật
export async function updateSinhVienHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const existed = await getSinhVienById(id);
    if (!existed) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sinh viên" });
    }

    const {
      ma_sv,
      ho_ten,
      email,
      sdt,
      khoa_id,
      lop_nien_che,
      gioi_tinh_id,
      ngay_sinh,
      trang_thai_id,
      user,
    } = req.body;

    const sv = await updateSinhVien(id, {
      ma_sv: ma_sv ?? existed.ma_sv,
      ho_ten: ho_ten ?? existed.ho_ten,
      email: email !== undefined ? email : existed.email ?? null,
      sdt: sdt !== undefined ? sdt : existed.sdt ?? null,
      khoa_id:
        khoa_id !== undefined
          ? khoa_id
            ? Number(khoa_id)
            : null
          : existed.khoa_id ?? null,
      lop_nien_che:
        lop_nien_che !== undefined
          ? lop_nien_che
          : existed.lop_nien_che ?? null,
      gioi_tinh_id:
        gioi_tinh_id !== undefined
          ? gioi_tinh_id
            ? Number(gioi_tinh_id)
            : null
          : existed.gioi_tinh_id ?? null,
      ngay_sinh:
        ngay_sinh !== undefined
          ? ngay_sinh
          : (existed.ngay_sinh as any as string) ?? null,
      trang_thai_id:
        trang_thai_id !== undefined
          ? Number(trang_thai_id)
          : existed.trang_thai_id ?? 1,
      user: user !== undefined ? user : existed.user ?? null,
    });

    res.json({ success: true, data: sv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

// DELETE /sinh-vien/:id    → soft delete
export async function deleteSinhVienHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const ok = await deleteSinhVien(id);
    if (!ok) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sinh viên" });
    }
    res.json({
      success: true,
      message:
        "Đã cập nhật trạng thái sinh viên thành nghỉ (trang_thai_id = 2)",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}
