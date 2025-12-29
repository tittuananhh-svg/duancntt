import { Request, Response } from 'express';
import {
  createHocKy,
  deleteHocKy,
  getHocKyById,
  searchHocKy,
  updateHocKy,
} from '../services/hocky.service';

export async function getListHocKy(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const data = await searchHocKy(q);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function getOneHocKy(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const data = await getHocKyById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function createHocKyHandler(req: Request, res: Response) {
  try {
    const { nam_hoc, hoc_ky, ngay_bat_dau, ngay_ket_thuc } = req.body;

    if (!nam_hoc || hoc_ky === undefined) {
      return res
        .status(400)
        .json({ success: false, message: 'Thiếu nam_hoc hoặc hoc_ky' });
    }

    const data = await createHocKy({
      nam_hoc,
      hoc_ky: Number(hoc_ky),
      ngay_bat_dau: ngay_bat_dau ?? null,
      ngay_ket_thuc: ngay_ket_thuc ?? null,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function updateHocKyHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const payload: any = {};
    if ('nam_hoc' in req.body) payload.nam_hoc = req.body.nam_hoc;
    if ('hoc_ky' in req.body) payload.hoc_ky = Number(req.body.hoc_ky);
    if ('ngay_bat_dau' in req.body) payload.ngay_bat_dau = req.body.ngay_bat_dau; // null OK
    if ('ngay_ket_thuc' in req.body) payload.ngay_ket_thuc = req.body.ngay_ket_thuc; // null OK

    const data = await updateHocKy(id, payload);

    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function deleteHocKyHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const ok = await deleteHocKy(id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ' });
    }
    res.json({ success: true, message: 'Xoá thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}
