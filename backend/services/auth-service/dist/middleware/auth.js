"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const authMiddleware = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        logger_1.logger.error("Auth middleware error:", error);
        res.status(401).json({
            success: false,
            status: 401,
            message: "Invalid token",
            error: "INVALID_TOKEN",
            timestamp: new Date().toISOString(),
        });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map