// src/controllers/lophocphan.controller.ts
import { Request, Response } from 'express';
import {
  createPhanBoLopHocPhan,
  deleteLopHocPhan,
  getDanhSachLopTheoKy,
  getLopHocPhanDetail,
  getMonHocTheoKy,
  getPhongTheoKy,
  updateLopHocPhanPartial,
} from '../services/lophocphan.service';

export async function createPhanBoLopHocPhanHandler(req: Request, res: Response) {
  try {
    const data = await createPhanBoLopHocPhan(req.body);
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function getLopHocPhanDetailHandler(req: Request, res: Response) {
  try {
    const ma_lop_hp = req.params.ma_lop_hp;
    const data = await getLopHocPhanDetail(ma_lop_hp);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function updateLopHocPhanPartialHandler(req: Request, res: Response) {
  try {
    const ma_lop_hp = req.params.ma_lop_hp;
    const data = await updateLopHocPhanPartial(ma_lop_hp, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error(err);
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function deleteLopHocPhanHandler(req: Request, res: Response) {
  try {
    const ma_lop_hp = req.params.ma_lop_hp;
    const ok = await deleteLopHocPhan(ma_lop_hp);
    if (!ok) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
    return res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

/* =========================
   3 API BÁO CÁO / TRA CỨU
   ========================= */

export async function getMonHocTheoKyHandler(req: Request, res: Response) {
  try {
    const ky_hoc_id = Number(req.params.ky_hoc_id);
    if (!ky_hoc_id) return res.status(400).json({ success: false, message: 'ky_hoc_id không hợp lệ' });

    const data = await getMonHocTheoKy(ky_hoc_id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function getPhongTheoKyHandler(req: Request, res: Response) {
  try {
    const ky_hoc_id = Number(req.params.ky_hoc_id);
    if (!ky_hoc_id) return res.status(400).json({ success: false, message: 'ky_hoc_id không hợp lệ' });

    const data = await getPhongTheoKy(ky_hoc_id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

export async function getDanhSachLopTheoKyHandler(req: Request, res: Response) {
  try {
    const ky_hoc_id = Number(req.params.ky_hoc_id);
    if (!ky_hoc_id) return res.status(400).json({ success: false, message: 'ky_hoc_id không hợp lệ' });

    const data = await getDanhSachLopTheoKy(ky_hoc_id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}
