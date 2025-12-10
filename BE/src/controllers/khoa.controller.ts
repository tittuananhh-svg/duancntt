// src/controllers/khoa.controller.ts
import { Request, Response } from 'express';
import {
  createKhoa,
  deleteKhoa,
  getKhoaById,
  searchKhoa,
  updateKhoa,
} from '../services/khoa.service';

export async function getListKhoa(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const data = await searchKhoa(q);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function getOneKhoa(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const khoa = await getKhoaById(id);
    if (!khoa) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khoa' });
    }
    res.json({ success: true, data: khoa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function createKhoaHandler(req: Request, res: Response) {
  try {
    const { ma_khoa, ten_khoa, mo_ta, truong_khoa_id } = req.body;

    if (!ma_khoa || !ten_khoa) {
      return res.status(400).json({
        success: false,
        message: 'ma_khoa và ten_khoa là bắt buộc',
      });
    }

    const khoa = await createKhoa({
      ma_khoa,
      ten_khoa,
      mo_ta,
      truong_khoa_id: truong_khoa_id ? Number(truong_khoa_id) : null,
    });

    res.status(201).json({ success: true, data: khoa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function updateKhoaHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { ma_khoa, ten_khoa, mo_ta, truong_khoa_id } = req.body;

    const existed = await getKhoaById(id);
    if (!existed) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khoa' });
    }

    const khoa = await updateKhoa(id, {
      ma_khoa: ma_khoa ?? existed.ma_khoa,
      ten_khoa: ten_khoa ?? existed.ten_khoa,
      mo_ta: mo_ta ?? existed.mo_ta,
      truong_khoa_id:
        truong_khoa_id !== undefined
          ? Number(truong_khoa_id)
          : existed.truong_khoa_id,
    });

    res.json({ success: true, data: khoa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function deleteKhoaHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const ok = await deleteKhoa(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khoa' });
    }
    res.json({ success: true, message: 'Xoá thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}
