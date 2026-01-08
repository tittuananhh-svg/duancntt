import { Router } from "express";
import { changePassword } from "../controllers/auth.controller";
import { getThoiKhoaBieuSinhVienController } from "../controllers/student.controllers";
const router = Router();

router.post("/change-password", changePassword);
router.post("/thoi-khoa-bieu", getThoiKhoaBieuSinhVienController);

export default router;
