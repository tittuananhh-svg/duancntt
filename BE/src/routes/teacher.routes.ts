import { Router } from "express";
import {
  getThoiKhoaBieuGiangVienController,
  getMeGiangVienController,
} from "../controllers/teacher.controllers";
import {
  getDanhSachLopHocPhanCuaGiangVienController,
  getAllSinhVienTrongLopHocPhanController,
} from "../controllers/giangVienLopHocPhan.controller";
import { upsertDiemQuaTrinhController } from "../controllers/diemQuaTrinh.controller";

const router = Router();

router.get("/thoi-khoa-bieu", getThoiKhoaBieuGiangVienController);
router.get("/lop-hoc-phan", getDanhSachLopHocPhanCuaGiangVienController);
router.get("/getinfo", getMeGiangVienController);

router.get("/lop-hoc-phan/sinh-vien", getAllSinhVienTrongLopHocPhanController);
router.post("/lop-hoc-phan/diem-qua-trinh", upsertDiemQuaTrinhController);
export default router;
