import { Router } from "express";
import { getThoiKhoaBieuGiangVienController } from "../controllers/teacher.controllers";
const router = Router();

router.post("/thoi-khoa-bieu", getThoiKhoaBieuGiangVienController);

export default router;
