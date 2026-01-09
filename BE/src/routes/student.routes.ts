import { Router } from "express";
import { changePassword } from "../controllers/auth.controller";
import {
  getThoiKhoaBieuSinhVienController,
  getMeSinhVienController,
} from "../controllers/student.controllers";
const router = Router();

router.post("/change-password", changePassword);
router.get("/thoi-khoa-bieu", getThoiKhoaBieuSinhVienController);
router.get("/getinfo", getMeSinhVienController);

export default router;
