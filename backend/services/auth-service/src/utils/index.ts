// ============================================
// Shared Utilities
// ============================================

import winston from "winston";

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

export const logger = createLogger("auth-service");

// Password Helpers
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = require("bcryptjs");
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const bcrypt = require("bcryptjs");
  return bcrypt.compare(password, hash);
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