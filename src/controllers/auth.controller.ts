import { Request, Response } from 'express';
import { selectWithFkRealText, refreshService, logoutService, registerService, loginService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendError(res, 400, 'Thiếu username hoặc password');
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';

    const result = await loginService(username, password, userAgent, ipAddress);

    if (!result) {
      return sendError(res, 401, 'Sai tên đăng nhập hoặc mật khẩu');
    }

    return sendSuccess(res, 'Đăng nhập thành công', result);
  } catch (err: any) {
    console.error(err);
    return sendError(res, 500, 'Lỗi server');
  }
}

export async function refreshController(req: Request, res: Response) {
  const refreshToken =
    (req.body && req.body.refreshToken) ||
    (req.cookies && req.cookies.refreshToken);

  if (!refreshToken) {
    return res.status(401).json({ message: 'Missing refresh token' });
  }

  const ua = req.headers['user-agent'] || undefined;
  const ip = req.ip;

  const result = await refreshService(
    refreshToken,
    typeof ua === 'string' ? ua : undefined,
    ip
  );

  if (!result) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  return res.json(result);
}

export async function logoutController(req: Request, res: Response) {
  const refreshToken =
    (req.body && req.body.refreshToken) ||
    (req.cookies && req.cookies.refreshToken);

  await logoutService(refreshToken);
  return res.json({ message: 'Logged out' });
}

export async function register(req: Request, res: Response) {
  try {
    const { username, password, email, role_id, user_type_id, user_ref_id } =
      req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập username và password'
      });
    }

    try {
      const newUser = await registerService({
        username,
        password,
        email,
        role_id,
        user_type_id,
        user_ref_id
      });

      return res.status(201).json({
        status: 'success',
        message: 'Tạo tài khoản thành công',
        data: {
          user: newUser
        }
      });
    } catch (e: any) {
      if (e.message === 'USERNAME_EXISTS') {
        return res.status(400).json({
          status: 'error',
          message: 'Username đã tồn tại'
        });
      }
      if (e.message === 'EMAIL_EXISTS') {
        return res.status(400).json({
          status: 'error',
          message: 'Email đã tồn tại'
        });
      }
      throw e;
    }
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
}
export async function getTableWithText(req: Request, res: Response) {
  try {
    const { table } = req.params;

    const data = await selectWithFkRealText(table);

    return res.json({
      status: 'success',
      data
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Lỗi server'
    });
  }
}
