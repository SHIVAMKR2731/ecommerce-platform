"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const middleware_1 = require("../../shared/src/middleware");
const utils_1 = require("../../shared/src/utils");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const rabbitmq_1 = require("./config/rabbitmq");
const deliveryRoutes_1 = __importDefault(require("./routes/deliveryRoutes"));
const socketHandlers_1 = require("./socket/socketHandlers");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});
// Set IO instance for socket handlers
(0, socketHandlers_1.setIO)(io);
const PORT = process.env.PORT || 3007;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);
// Request ID middleware
app.use(middleware_1.generateRequestId);
// Health check
app.get("/health", (req, res) => {
    res.json({
        service: "delivery-service",
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});
// Routes
app.use("/api/deliveries", deliveryRoutes_1.default);
// Error handling
app.use(middleware_1.errorHandler);
// Socket.io setup
(0, socketHandlers_1.setupSocketHandlers)(io);
// Start server
async function startServer() {
    try {
        // Connect to databases and services
        await (0, database_1.connectDB)();
        await (0, redis_1.connectRedis)();
        await (0, rabbitmq_1.connectRabbitMQ)();
        server.listen(PORT, () => {
            utils_1.logger.info(`Delivery Service running on port ${PORT}`);
        });
    }
    catch (error) {
        utils_1.logger.error("Failed to start Delivery Service", error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map