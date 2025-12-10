import { Router } from 'express';

import {
  createKhoaHandler,
  deleteKhoaHandler,
  getListKhoa,
  getOneKhoa,
  updateKhoaHandler,
} from '../controllers/khoa.controller';

import {
  createMonHocHandler,
  deleteMonHocHandler,
  getListMonHoc,
  getOneMonHoc,
  updateMonHocHandler,
} from '../controllers/monhoc.controllers';

import {
  createGiangVienHandler,
  deleteGiangVienHandler,
  getListGiangVien,
  getOneGiangVien,
  updateGiangVienHandler,
} from '../controllers/giangvien.controller';

import {
  createSinhVienHandler,
  deleteSinhVienHandler,
  getListSinhVien,
  getOneSinhVien,
  updateSinhVienHandler,
} from '../controllers/sinhvien.controllers';



const router = Router();

/* ================== KHOA ================== */
// GET /khoa?q=keyword  → danh sách + search theo ma_khoa, ten_khoa
router.get('/khoa', getListKhoa);

// GET /khoa/:id        → chi tiết 1 khoa
router.get('/khoa/:id', getOneKhoa);

// POST /khoa           → thêm mới khoa
router.post('/khoa', createKhoaHandler);

// PUT /khoa/:id        → cập nhật khoa
router.put('/khoa/:id', updateKhoaHandler);

// DELETE /khoa/:id     → xóa khoa (tuỳ bạn là delete thật hay soft delete)
router.delete('/khoa/:id', deleteKhoaHandler);


/* ================== MÔN HỌC ================== */
// GET /mon-hoc?q=keyword  → danh sách + search theo ma_mon, ten_mon
router.get('/mon-hoc', getListMonHoc);

// GET /mon-hoc/:id        → chi tiết 1 môn học
router.get('/mon-hoc/:id', getOneMonHoc);

// POST /mon-hoc           → thêm mới môn học
router.post('/mon-hoc', createMonHocHandler);

// PUT /mon-hoc/:id        → cập nhật môn học
router.put('/mon-hoc/:id', updateMonHocHandler);

// DELETE /mon-hoc/:id     → soft delete (chỉ update trang_thai = 2)
router.delete('/mon-hoc/:id', deleteMonHocHandler);


// GET /giang-vien?q=keyword   → danh sách + search
router.get('/giang-vien', getListGiangVien);

// GET /giang-vien/:id         → chi tiết 1 giảng viên
router.get('/giang-vien/:id', getOneGiangVien);

// POST /giang-vien            → thêm mới
router.post('/giang-vien', createGiangVienHandler);

// PUT /giang-vien/:id         → cập nhật
router.put('/giang-vien/:id', updateGiangVienHandler);

// DELETE /giang-vien/:id      → xóa
router.delete('/giang-vien/:id', deleteGiangVienHandler);

router.get('/sinh-vien', getListSinhVien);
router.get('/sinh-vien/:id', getOneSinhVien);
router.post('/sinh-vien', createSinhVienHandler);
router.put('/sinh-vien/:id', updateSinhVienHandler);
router.delete('/sinh-vien/:id', deleteSinhVienHandler);



export default router;
