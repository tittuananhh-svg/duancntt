import { Router } from "express";
import {
  getThoiKhoaBieuGiangVienController,
  getMeGiangVienController,
} from "../controllers/teacher.controllers";
const router = Router();

router.get("/thoi-khoa-bieu", getThoiKhoaBieuGiangVienController);
router.get("/getinfo", getMeGiangVienController);
export default router;
