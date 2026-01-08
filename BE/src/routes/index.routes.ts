import { Express } from "express";
import authRouter from "./auth.routes";
import adminRouter from "./admin.routes";
import studentRouter from "./student.routes";
import teacherRouter from "./teacher.routes";

import { authGuard } from "../middlewares/authGuard";
import { roleGuard } from "../middlewares/roleGuard";

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/admin", authGuard, roleGuard(["ADMIN"]), adminRouter);
  app.use("/api/student", authGuard, roleGuard(["STUDENT"]), studentRouter);
  app.use("/api/teacher", authGuard, roleGuard(["TEACHER"]), teacherRouter);
}
