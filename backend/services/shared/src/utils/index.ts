// ============================================
// Shared Utilities
// ============================================

import winston from "winston";
import { Request, Response } from "express";
import { ApiResponse, PaginatedResponse } from "../types";

// Winston Logger Configuration
export const createLogger = (serviceName: string) => {
  return winston.createLogger({
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: "logs/error.log", level: "error" }),
      new winston.transports.File({ filename: "logs/combined.log" }),
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });
};

export const logger = createLogger("BazaarLink");

// API Response Handler
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    status: statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  statusCode: number = 200
) => {
  const response: PaginatedResponse<T> = {
    success: true,
    status: statusCode,
    data,
    pagination: {
      ...pagination,
      pages: Math.ceil(pagination.total / pagination.limit),
    },
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
};

// Validation Helpers
export const validatePagination = (page?: any, limit?: any) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return { page: p, limit: l };
};

// Distance Calculation (Haversine Formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Token Helpers
export const generateRefreshToken = (userId: string, tokenVersion: number): string => {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ userId, tokenVersion }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};

export const generateAccessToken = (userId: string, email: string, role: string): string => {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  );
};

// Password Helpers
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = require("bcrypt");
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const bcrypt = require("bcrypt");
  return bcrypt.compare(password, hash);
};

// Rate Limiter Helper
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (identifier: string): boolean => {
    const now = Date.now();
    const userRequest = requests.get(identifier);

    if (!userRequest || now > userRequest.resetTime) {
      requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userRequest.count < maxRequests) {
      userRequest.count++;
      return true;
    }

    return false;
  };
};

// Retry Logic
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries exceeded");
}
