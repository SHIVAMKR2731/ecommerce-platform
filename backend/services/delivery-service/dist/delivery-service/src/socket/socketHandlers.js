"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.setIO = exports.emitToRole = exports.emitToDelivery = exports.emitToUser = exports.setupSocketHandlers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("../../../shared/src/utils");
const setupSocketHandlers = (io) => {
    // Middleware for authentication
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error"));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userRole = decoded.role;
            next();
        }
        catch (err) {
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.userId;
        const userRole = socket.userRole;
        utils_1.logger.info(`User connected to delivery service: ${userId} (${userRole})`);
        // Join user-specific room
        socket.join(`user_${userId}`);
        // Join role-specific room
        socket.join(`role_${userRole}`);
        // Handle delivery tracking
        socket.on("track_delivery", (deliveryId) => {
            socket.join(`delivery_${deliveryId}`);
            utils_1.logger.info(`User ${userId} started tracking delivery ${deliveryId}`);
        });
        // Handle stop tracking
        socket.on("stop_track_delivery", (deliveryId) => {
            socket.leave(`delivery_${deliveryId}`);
            utils_1.logger.info(`User ${userId} stopped tracking delivery ${deliveryId}`);
        });
        // Handle location updates from delivery agents
        socket.on("update_location", (data) => {
            if (userRole === "DELIVERY_AGENT") {
                // Broadcast location update to delivery room
                socket.to(`delivery_${data.deliveryId}`).emit("delivery_location_update", {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: new Date().toISOString(),
                });
                // Also broadcast to order room (for order tracking)
                socket.to(`order_${data.deliveryId}`).emit("delivery_location_update", {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: new Date().toISOString(),
                });
            }
        });
        socket.on("disconnect", () => {
            utils_1.logger.info(`User disconnected from delivery service: ${userId}`);
        });
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
// Helper functions to emit events
const emitToUser = (userId, event, data) => {
    const io = (0, exports.getIO)();
    io.to(`user_${userId}`).emit(event, data);
};
exports.emitToUser = emitToUser;
const emitToDelivery = (deliveryId, event, data) => {
    const io = (0, exports.getIO)();
    io.to(`delivery_${deliveryId}`).emit(event, data);
};
exports.emitToDelivery = emitToDelivery;
const emitToRole = (role, event, data) => {
    const io = (0, exports.getIO)();
    io.to(`role_${role}`).emit(event, data);
};
exports.emitToRole = emitToRole;
// Get io instance
let ioInstance;
const setIO = (io) => {
    ioInstance = io;
};
exports.setIO = setIO;
const getIO = () => {
    if (!ioInstance) {
        throw new Error("Socket.io not initialized");
    }
    return ioInstance;
};
exports.getIO = getIO;
//# sourceMappingURL=socketHandlers.js.map