import express from "express";
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
import { connectRabbitMQ } from "./config/rabbitmq";
import deliveryRoutes from "./routes/deliveryRoutes";
import { setupSocketHandlers, setIO } from "./socket/socketHandlers";

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

const PORT = process.env.PORT || 3007;

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
    service: "delivery-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/deliveries", deliveryRoutes);

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
      logger.info(`Delivery Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start Delivery Service", error);
    process.exit(1);
  }
}

startServer();