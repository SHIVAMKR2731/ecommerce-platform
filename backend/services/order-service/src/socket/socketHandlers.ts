import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../../../shared/src/utils";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Middleware for authentication
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const userRole = socket.userRole!;

    logger.info(`User connected: ${userId} (${userRole})`);

    // Join user-specific room
    socket.join(`user_${userId}`);

    // Join role-specific room
    socket.join(`role_${userRole}`);

    // Handle order tracking
    socket.on("track_order", (orderId: string) => {
      socket.join(`order_${orderId}`);
      logger.info(`User ${userId} started tracking order ${orderId}`);
    });

    // Handle stop tracking
    socket.on("stop_track_order", (orderId: string) => {
      socket.leave(`order_${orderId}`);
      logger.info(`User ${userId} stopped tracking order ${orderId}`);
    });

    // Handle delivery location updates
    socket.on("update_location", (data: { orderId: string; latitude: number; longitude: number }) => {
      if (userRole === "DELIVERY_AGENT") {
        // Broadcast location update to order room
        socket.to(`order_${data.orderId}`).emit("delivery_location_update", {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });
};

// Helper functions to emit events
export const emitToUser = (userId: string, event: string, data: any) => {
  const io = getIO();
  io.to(`user_${userId}`).emit(event, data);
};

export const emitToOrder = (orderId: string, event: string, data: any) => {
  const io = getIO();
  io.to(`order_${orderId}`).emit(event, data);
};

export const emitToRole = (role: string, event: string, data: any) => {
  const io = getIO();
  io.to(`role_${role}`).emit(event, data);
};

// Get io instance (this would need to be set when initializing)
let ioInstance: Server;

export const setIO = (io: Server) => {
  ioInstance = io;
};

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
};