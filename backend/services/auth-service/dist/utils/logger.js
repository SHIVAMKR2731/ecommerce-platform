"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logger = void 0;
// src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(process.cwd(), "logs");
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir);
}
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: "auth-service" },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, "error.log"),
            level: "error",
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, "combined.log"),
        }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`)),
        }),
    ],
});
exports.requestLogger = winston_1.default.createLogger({
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, "requests.log"),
        }),
    ],
});
//# sourceMappingURL=logger.js.map