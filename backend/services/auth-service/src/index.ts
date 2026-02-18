// src/index.ts
import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { RedisClient } from "./services/redis";
import { RabbitMQService } from "./services/rabbitmq";
import { createAuthRoutes } from "./routes/authRoutes";
import { logger, requestLogger } from "./utils/logger";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});
app.use("/api/", limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    requestLogger.info({
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
let redisClient: RedisClient;
let rabbitmqService: RabbitMQService;

async function init() {
  try {
    // Initialize Redis
    redisClient = new RedisClient();
    await redisClient.connect();

    // Initialize RabbitMQ
    rabbitmqService = new RabbitMQService();
    await rabbitmqService.connect();

    // Routes
    app.use("/api/auth", createAuthRoutes(redisClient, rabbitmqService));

    // Health check
    app.get("/health", (req: Request, res: Response) => {
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
    app.get("/ready", (req: Request, res: Response) => {
      const isReady =
        redisClient.isHealthy() && rabbitmqService.isHealthy();
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
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        status: 404,
        message: "Endpoint not found",
        error: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
    });

    // Error handler
    app.use(
      (
        err: any,
        req: Request,
        res: Response,
        next: NextFunction
      ) => {
        logger.error("Unhandled error:", err);
        res.status(err.status || 500).json({
          success: false,
          status: err.status || 500,
          message: err.message || "Internal server error",
          error: err.code || "INTERNAL_ERROR",
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Start server
    app.listen(PORT, () => {
      logger.info(`Auth Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to initialize services:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  try {
    await redisClient.disconnect();
    await rabbitmqService.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
});

init();
