import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import { errorHandler, generateRequestId } from "../../shared/src/middleware";
import { logger } from "../../shared/src/utils";
import { connectDB } from "./config/database";
import { connectRedis } from "./config/redis";
import { connectRabbitMQ, consumeFromQueue } from "./config/rabbitmq";
import notificationRoutes from "./routes/notificationRoutes";
import { setupSocketHandlers, setIO } from "./socket/socketHandlers";
import { handleNotificationEvents } from "./services/notificationService";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Set IO instance for socket handlers
setIO(io);

const PORT = process.env.PORT || 3008;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Request ID middleware
app.use(generateRequestId);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    service: "notification-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/notifications", notificationRoutes);

// Error handling
app.use(errorHandler);

// Socket.io setup
setupSocketHandlers(io);

// Start server
async function startServer() {
  try {
    // Connect to databases and services
    // await connectDB();
    // await connectRedis();
    // await connectRabbitMQ();

    // Set up message queue consumers
    // await setupQueueConsumers();

    server.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start Notification Service", error);
    process.exit(1);
  }
}

// Set up queue consumers for different events
async function setupQueueConsumers() {
  try {
    // Order events
    await consumeFromQueue("order.created", handleNotificationEvents);
    await consumeFromQueue("order.status_updated", handleNotificationEvents);
    await consumeFromQueue("order.cancelled", handleNotificationEvents);

    // Delivery events
    await consumeFromQueue("delivery.assigned", handleNotificationEvents);
    await consumeFromQueue("delivery.status_updated", handleNotificationEvents);

    // Payment events
    await consumeFromQueue("payment.completed", handleNotificationEvents);
    await consumeFromQueue("payment.failed", handleNotificationEvents);

    logger.info("Queue consumers set up successfully");
  } catch (error) {
    logger.error("Failed to set up queue consumers", error);
  }
}

startServer();