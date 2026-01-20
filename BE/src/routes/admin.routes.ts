import { Router } from "express";

import {
  createKhoaHandler,
  deleteKhoaHandler,
  getListKhoa,
  getOneKhoa,
  updateKhoaHandler,
} from "../controllers/khoa.controller";

import {
  createMonHocHandler,
  deleteMonHocHandler,
  getListMonHoc,
  getOneMonHoc,
  updateMonHocHandler,
} from "../controllers/monhoc.controllers";

import {
  createGiangVienHandler,
  deleteGiangVienHandler,
  getListGiangVien,
  getOneGiangVien,
  updateGiangVienHandler,
} from "../controllers/giangvien.controller";

import {
  createSinhVienHandler,
  deleteSinhVienHandler,
  getListSinhVien,
  getOneSinhVien,
  updateSinhVienHandler,
} from "../controllers/sinhvien.controllers";

import {
  createHocKyHandler,
  deleteHocKyHandler,
  getListHocKy,
  getOneHocKy,
  updateHocKyHandler,
} from "../controllers/hocky.controller";

import {
  createPhanBoLopHocPhanHandler,
  deleteLopHocPhanHandler,
  getDanhSachLopTheoKyHandler,
  getLopHocPhanDetailHandler,
  getMonHocTheoKyHandler,
  getPhongTheoKyHandler,
  updateLopHocPhanPartialHandler,
} from "../controllers/lophocphan.controller";
import {
  allocateStudentsToMonHoc,
  getSinhVienByKyHoc,
  getSinhVienDaDangKyByMaLopHP,
} from "../controllers/phanbo.controller";

import {
  listKeHoachThiController,
  createKeHoachThiController,
  updateKeHoachThiController,
} from "../controllers/kehoachthi.controller";

import {
  allocateOneMonHocInKyController,
  allocateManyMonHocController,
  allocateAllMonHocInKyController,
} from "../controllers/management.controllers";

import { getSinhVienThieuTinChiController } from "../controllers/report.controller";

import { forceAllocateController } from "../controllers/forceAllocate.controller";

import { getSinhVienDaDangKyTrongKyController } from "../controllers/dangKyMonHoc.controller";
import {
  createLichThi,
  getLichThiList,
} from "../controllers/lichThi.controller";
import { phanBoSinhVienVaoLichThi } from "../controllers/phanBoLichThi.controller";

const router = Router();

/* ================== KHOA ================== */
// GET /khoa?q=keyword  → danh sách + search theo ma_khoa, ten_khoa
router.get("/khoa", getListKhoa);

// GET /khoa/:id        → chi tiết 1 khoa
router.get("/khoa/:id", getOneKhoa);

// POST /khoa           → thêm mới khoa
router.post("/khoa", createKhoaHandler);

// PUT /khoa/:id        → cập nhật khoa
router.put("/khoa/:id", updateKhoaHandler);

// DELETE /khoa/:id     → xóa khoa (tuỳ bạn là delete thật hay soft delete)
router.delete("/khoa/:id", deleteKhoaHandler);

/* ================== MÔN HỌC ================== */
// GET /mon-hoc?q=keyword  → danh sách + search theo ma_mon, ten_mon
router.get("/mon-hoc", getListMonHoc);

// GET /mon-hoc/:id        → chi tiết 1 môn học
router.get("/mon-hoc/:id", getOneMonHoc);

// POST /mon-hoc           → thêm mới môn học
router.post("/mon-hoc", createMonHocHandler);

// PUT /mon-hoc/:id        → cập nhật môn học
router.put("/mon-hoc/:id", updateMonHocHandler);

// DELETE /mon-hoc/:id     → soft delete (chỉ update trang_thai = 2)
router.delete("/mon-hoc/:id", deleteMonHocHandler);

// GET /giang-vien?q=keyword   → danh sách + search
router.get("/giang-vien", getListGiangVien);

// GET /giang-vien/:id         → chi tiết 1 giảng viên
router.get("/giang-vien/:id", getOneGiangVien);

// POST /giang-vien            → thêm mới
router.post("/giang-vien", createGiangVienHandler);

// PUT /giang-vien/:id         → cập nhật
router.put("/giang-vien/:id", updateGiangVienHandler);

// DELETE /giang-vien/:id      → xóa
router.delete("/giang-vien/:id", deleteGiangVienHandler);

router.get("/sinh-vien", getListSinhVien);
router.get("/sinh-vien/:id", getOneSinhVien);
router.post("/sinh-vien", createSinhVienHandler);
router.put("/sinh-vien/:id", updateSinhVienHandler);
router.delete("/sinh-vien/:id", deleteSinhVienHandler);

// ===== HỌC KỲ =====
router.get("/hoc-ky", getListHocKy);
router.get("/hoc-ky/:id", getOneHocKy);
router.post("/hoc-ky", createHocKyHandler);
router.put("/hoc-ky/:id", updateHocKyHandler);
router.delete("/hoc-ky/:id", deleteHocKyHandler);

// ===== LỚP HỌC PHẦN =====

// Thêm mới phân bổ
router.post("/lop-hoc-phan/phan-bo", createPhanBoLopHocPhanHandler);

// 3 API báo cáo theo kỳ (ĐẶT TRƯỚC /:ma_lop_hp)
router.get("/lop-hoc-phan/mon-hoc-theo-ky/:ky_hoc_id", getMonHocTheoKyHandler);
router.get("/lop-hoc-phan/phong-theo-ky/:ky_hoc_id", getPhongTheoKyHandler);
router.get(
  "/lop-hoc-phan/danh-sach-theo-ky/:ky_hoc_id",
  getDanhSachLopTheoKyHandler,
);

// Thông tin theo mã lớp HP
router.get("/lop-hoc-phan/:ma_lop_hp", getLopHocPhanDetailHandler);

// Update partial (chỉ field truyền lên)
router.put("/lop-hoc-phan/:ma_lop_hp", updateLopHocPhanPartialHandler);

router.post("/phan-bo-sinh-vien-mon-hoc", allocateStudentsToMonHoc);
router.post("/sinh-vien-theo-ky-hoc", getSinhVienByKyHoc);
router.post("/sinh-vien-theo-ma-lop-hp", getSinhVienDaDangKyByMaLopHP);

router.post("/ke-hoach-thi/list", listKeHoachThiController);
router.post("/ke-hoach-thi/create", createKeHoachThiController);
router.put("/ke-hoach-thi/update", updateKeHoachThiController);

router.post("/phan-bo/mon-hoc", allocateOneMonHocInKyController);
router.post("/phan-bo/mon-hoc/bulk", allocateManyMonHocController);
router.post("/phan-bo/ky-hoc", allocateAllMonHocInKyController);
router.post("/phan-bo/ep-cung", forceAllocateController);

// report
router.get("/bao-cao/sv-thieu-tin-chi", getSinhVienThieuTinChiController);

router.get("/dang-ky/sinh-vien-theo-ky", getSinhVienDaDangKyTrongKyController);

router.post("/lich-thi", createLichThi);
router.get("/lich-thi", getLichThiList);
router.post("/lich-thi/phan-bo/:id", phanBoSinhVienVaoLichThi);

export default router;
