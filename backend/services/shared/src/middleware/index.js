"use strict";
// ============================================
// Shared Middleware
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestId = exports.requireRole = exports.authMiddleware = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || "Internal Server Error";
    const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
    const response = {
        success: false,
        status: statusCode,
        message,
        error: code,
        timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            throw new AppError("Unauthorized", 401, "NO_TOKEN");
        }
        const decoded = (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (err) {
        next(new AppError("Invalid token", 401, "INVALID_TOKEN"));
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        throw new AppError("Unauthorized", 401, "NO_USER");
    }
    if (!roles.includes(req.user.role)) {
        throw new AppError("Forbidden", 403, "INSUFFICIENT_PERMISSIONS");
    }
    next();
};
exports.requireRole = requireRole;
const generateRequestId = (req, res, next) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
};
exports.generateRequestId = generateRequestId;
//# sourceMappingURL=index.js.map