import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authGuard';

export function roleGuard(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.roleId;

      if (!userRole) {
        return res.status(403).json({
          status: 'error',
          message: 'Không xác định được role người dùng'
        });
      }

      // Nếu trong token roleId là số, bạn có thể map sang tên
      // ví dụ: 1=ADMIN, 2=TEACHER, 3=STUDENT
      const roleMap: Record<number, string> = {
        1: 'ADMIN',
        2: 'TEACHER',
        3: 'STUDENT'
      };

      const roleName = roleMap[userRole];

      if (!allowedRoles.includes(roleName)) {
        return res.status(403).json({
          status: 'error',
          message: `Không có quyền truy cập (role hiện tại: ${roleName})`
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Lỗi khi kiểm tra quyền truy cập'
      });
    }
  };
}
