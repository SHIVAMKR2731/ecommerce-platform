import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import { errorHandler, generateRequestId } from "../../shared/src/middleware";
import { logger } from "../../shared/src/utils";
import { connectDB } from "./src/config/database";
import { connectRedis } from "./src/config/redis";
import { connectRabbitMQ } from "./src/config/rabbitmq";
import orderRoutes from "./src/routes/orderRoutes";
import { setupSocketHandlers, setIO } from "./src/socket/socketHandlers";

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

const PORT = process.env.PORT || 3005;

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
app.get("/health", (req, res) => {
  res.json({
    service: "order-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/orders", orderRoutes);

// Error handling
app.use(errorHandler);

// Socket.io setup
setupSocketHandlers(io);

// Start server
async function startServer() {
  try {
    // Connect to databases and services
    await connectDB();
    await connectRedis();
    await connectRabbitMQ();

    server.listen(PORT, () => {
      logger.info(`Order Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start Order Service", error);
    process.exit(1);
  }
}

startServer();