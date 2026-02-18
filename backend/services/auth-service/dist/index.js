"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = require("./services/redis");
const rabbitmq_1 = require("./services/rabbitmq");
const authRoutes_1 = require("./routes/authRoutes");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP",
});
app.use("/api/", limiter);
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger_1.requestLogger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            ip: req.ip,
        });
    });
    next();
});
// Initialize services
let redisClient;
let rabbitmqService;
async function init() {
    try {
        // Initialize Redis
        redisClient = new redis_1.RedisClient();
        await redisClient.connect();
        // Initialize RabbitMQ
        rabbitmqService = new rabbitmq_1.RabbitMQService();
        await rabbitmqService.connect();
        // Routes
        app.use("/api/auth", (0, authRoutes_1.createAuthRoutes)(redisClient, rabbitmqService));
        // Health check
        app.get("/health", (req, res) => {
            res.status(200).json({
                success: true,
                status: 200,
                message: "Auth Service is healthy",
                data: {
                    redis: redisClient.isHealthy(),
                    rabbitmq: rabbitmqService.isHealthy(),
                },
                timestamp: new Date().toISOString(),
            });
        });
        // Readiness check
        app.get("/ready", (req, res) => {
            const isReady = redisClient.isHealthy() && rabbitmqService.isHealthy();
            const statusCode = isReady ? 200 : 503;
            res.status(statusCode).json({
                success: isReady,
                status: statusCode,
                message: isReady
                    ? "Auth Service is ready"
                    : "Auth Service is not ready",
                timestamp: new Date().toISOString(),
            });
        });
        // 404 handler
        app.use((req, res) => {
            res.status(404).json({
                success: false,
                status: 404,
                message: "Endpoint not found",
                error: "NOT_FOUND",
                timestamp: new Date().toISOString(),
            });
        });
        // Error handler
        app.use((err, req, res, next) => {
            logger_1.logger.error("Unhandled error:", err);
            res.status(err.status || 500).json({
                success: false,
                status: err.status || 500,
                message: err.message || "Internal server error",
                error: err.code || "INTERNAL_ERROR",
                timestamp: new Date().toISOString(),
            });
        });
        // Start server
        app.listen(PORT, () => {
            logger_1.logger.info(`Auth Service listening on port ${PORT}`);
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to initialize services:", error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    logger_1.logger.info("SIGTERM received, shutting down gracefully");
    try {
        await redisClient.disconnect();
        await rabbitmqService.disconnect();
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error("Error during shutdown:", error);
        process.exit(1);
    }
});
init();
//# sourceMappingURL=index.js.map