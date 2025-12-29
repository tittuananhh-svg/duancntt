import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';


export interface AuthRequest extends Request {
  user?: {
    userId: number;
    roleId: number;
    userTypeId: number;
    userRefId: number | null;
  };
}


export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Chưa đăng nhập hoặc thiếu token'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as {
      userId: number;
      roleId: number;
      userTypeId: number;
      userRefId: number | null;
    };


    req.user = decoded;


    next();
  } catch (error: any) {
    console.error('Token verify failed:', error.message);


    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Token không hợp lệ'
    });
  }
}
