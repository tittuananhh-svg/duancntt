import { Router } from "express";
import { changePassword } from "../controllers/auth.controller";
import {
  getThoiKhoaBieuSinhVienController,
  getMeSinhVienController,
} from "../controllers/student.controllers";
import {
  getBangDiemTrongKyByTokenController,
  getBangDiemToanBoByTokenController,
} from "../controllers/bangDiemSinhVien.controller";
const router = Router();

router.post("/change-password", changePassword);
router.get("/thoi-khoa-bieu", getThoiKhoaBieuSinhVienController);
router.get("/getinfo", getMeSinhVienController);
router.get("/bang-diem", getBangDiemTrongKyByTokenController);
router.get("/bang-diem/toan-bo", getBangDiemToanBoByTokenController);

export default router;
