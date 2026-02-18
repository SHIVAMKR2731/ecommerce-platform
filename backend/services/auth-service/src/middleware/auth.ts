// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: "No token provided",
        error: "NO_TOKEN",
        timestamp: new Date().toISOString(),
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      status: 401,
      message: "Invalid token",
      error: "INVALID_TOKEN",
      timestamp: new Date().toISOString(),
    });
  }
};
