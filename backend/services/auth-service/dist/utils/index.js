"use strict";
// ============================================
// Shared Utilities
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = exports.generateRefreshToken = exports.verifyPassword = exports.hashPassword = exports.logger = exports.createLogger = void 0;
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
exports.logger = (0, exports.createLogger)("auth-service");
// Password Helpers
const hashPassword = async (password) => {
    const bcrypt = require("bcryptjs");
    return bcrypt.hash(password, 10);
};
exports.hashPassword = hashPassword;
const verifyPassword = async (password, hash) => {
    const bcrypt = require("bcryptjs");
    return bcrypt.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
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
//# sourceMappingURL=index.js.map