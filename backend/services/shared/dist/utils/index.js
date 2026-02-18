"use strict";
// ============================================
// Shared Utilities
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = exports.verifyPassword = exports.hashPassword = exports.generateAccessToken = exports.generateRefreshToken = exports.calculateDistance = exports.validatePagination = exports.sendPaginated = exports.sendSuccess = exports.logger = exports.createLogger = void 0;
exports.retry = retry;
const winston_1 = __importDefault(require("winston"));
// Winston Logger Configuration
const createLogger = (serviceName) => {
    return winston_1.default.createLogger({
        defaultMeta: { service: serviceName },
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        transports: [
            new winston_1.default.transports.File({ filename: "logs/error.log", level: "error" }),
            new winston_1.default.transports.File({ filename: "logs/combined.log" }),
            new winston_1.default.transports.Console({
                format: winston_1.default.format.simple(),
            }),
        ],
    });
};
exports.createLogger = createLogger;
exports.logger = (0, exports.createLogger)("BazaarLink");
// API Response Handler
const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
    const response = {
        success: true,
        status: statusCode,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendPaginated = (res, data, pagination, statusCode = 200) => {
    const response = {
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
exports.sendPaginated = sendPaginated;
// Validation Helpers
const validatePagination = (page, limit) => {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
    return { page: p, limit: l };
};
exports.validatePagination = validatePagination;
// Distance Calculation (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
exports.calculateDistance = calculateDistance;
// Token Helpers
const generateRefreshToken = (userId, tokenVersion) => {
    const jwt = require("jsonwebtoken");
    return jwt.sign({ userId, tokenVersion }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const generateAccessToken = (userId, email, role) => {
    const jwt = require("jsonwebtoken");
    return jwt.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: "15m" });
};
exports.generateAccessToken = generateAccessToken;
// Password Helpers
const hashPassword = async (password) => {
    const bcrypt = require("bcrypt");
    return bcrypt.hash(password, 10);
};
exports.hashPassword = hashPassword;
const verifyPassword = async (password, hash) => {
    const bcrypt = require("bcrypt");
    return bcrypt.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
// Rate Limiter Helper
const createRateLimiter = (maxRequests, windowMs) => {
    const requests = new Map();
    return (identifier) => {
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
exports.createRateLimiter = createRateLimiter;
// Retry Logic
async function retry(fn, maxRetries = 3, delayMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (err) {
            if (i === maxRetries - 1)
                throw err;
            await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
        }
    }
    throw new Error("Max retries exceeded");
}
//# sourceMappingURL=index.js.map