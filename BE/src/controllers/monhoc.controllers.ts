// src/controllers/monhoc.controllers.ts
import { Request, Response } from 'express';
import {
  createMonHoc,
  deleteMonHoc,
  getMonHocById,
  searchMonHoc,
  updateMonHoc,
} from '../services/monhoc.service';

// GET /mon-hoc?q=keyword  → danh sách + search theo ma_mon, ten_mon
export async function getListMonHoc(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const data = await searchMonHoc(q);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// GET /mon-hoc/:id        → chi tiết 1 môn học
export async function getOneMonHoc(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const monHoc = await getMonHocById(id);
    if (!monHoc) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy môn học' });
    }
    res.json({ success: true, data: monHoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// POST /mon-hoc           → thêm mới
export async function createMonHocHandler(req: Request, res: Response) {
  try {
    const {
      ma_mon,
      ten_mon,
      so_tin_chi,
      so_tiet_ly_thuyet,
      so_tiet_thuc_hanh,
    } = req.body;

    // validate
    if (!ma_mon || !ten_mon || !so_tin_chi) {
      return res.status(400).json({
        success: false,
        message: 'ma_mon, ten_mon và so_tin_chi là bắt buộc',
      });
    }

    const monHoc = await createMonHoc({
      ma_mon,
      ten_mon,
      so_tin_chi: Number(so_tin_chi),
      so_tiet_ly_thuyet: so_tiet_ly_thuyet
        ? Number(so_tiet_ly_thuyet)
        : null,
      so_tiet_thuc_hanh: so_tiet_thuc_hanh
        ? Number(so_tiet_thuc_hanh)
        : null,
    });

    res.status(201).json({ success: true, data: monHoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// PUT /mon-hoc/:id        → cập nhật
export async function updateMonHocHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const {
      ma_mon,
      ten_mon,
      so_tin_chi,
      so_tiet_ly_thuyet,
      so_tiet_thuc_hanh,
      trang_thai,
    } = req.body;

    const existed = await getMonHocById(id);
    if (!existed) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy môn học' });
    }

    const monHoc = await updateMonHoc(id, {
      ma_mon: ma_mon ?? existed.ma_mon,
      ten_mon: ten_mon ?? existed.ten_mon,
      so_tin_chi:
        so_tin_chi !== undefined
          ? Number(so_tin_chi)
          : existed.so_tin_chi,
      so_tiet_ly_thuyet:
        so_tiet_ly_thuyet !== undefined
          ? Number(so_tiet_ly_thuyet)
          : existed.so_tiet_ly_thuyet,
      so_tiet_thuc_hanh:
        so_tiet_thuc_hanh !== undefined
          ? Number(so_tiet_thuc_hanh)
          : existed.so_tiet_thuc_hanh,
      trang_thai:
        trang_thai !== undefined ? Number(trang_thai) : existed.trang_thai,
    });

    res.json({ success: true, data: monHoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// DELETE /mon-hoc/:id     → soft delete (trang_thai = 2)
export async function deleteMonHocHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const ok = await deleteMonHoc(id);
    if (!ok) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy môn học' });
    }
    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái môn học thành đóng',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}
