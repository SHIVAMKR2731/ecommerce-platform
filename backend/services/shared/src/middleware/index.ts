// ============================================
// Shared Middleware
// ============================================

import { Request, Response, NextFunction } from "express";
import { JwtPayload, verify } from "jsonwebtoken";
import { ApiResponse, AuthContext, UserRole } from "../types";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
      requestId?: string;
    }
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";

  const response: ApiResponse = {
    success: false,
    status: statusCode,
    message,
    error: code,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new AppError("Unauthorized", 401, "NO_TOKEN");
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    next(new AppError("Invalid token", 401, "INVALID_TOKEN"));
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401, "NO_USER");
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError("Forbidden", 403, "INSUFFICIENT_PERMISSIONS");
    }

    next();
  };

export const generateRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
};
