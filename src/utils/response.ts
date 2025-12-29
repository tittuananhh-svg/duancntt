import { Response } from "express";

export function sendSuccess(res: Response, message: string, data?: any) {
  return res.status(200).json({
    status: "success",
    message,
    data
  });
}

export function sendError(res: Response, statusCode: number, message: string) {
  return res.status(statusCode).json({
    status: "error",
    message
  });
}
