// src/routes/authRoutes.ts
import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { RedisClient } from "../services/redis";
import { RabbitMQService } from "../services/rabbitmq";
import { authMiddleware } from "../middleware/auth";

export function createAuthRoutes(
  redis: RedisClient,
  rabbitmq: RabbitMQService
): Router {
  const router = Router();
  const authController = new AuthController(redis, rabbitmq);

  // Public routes
  router.post("/signup", (req, res) =>
    authController.signup(req, res)
  );

  router.post("/login", (req, res) =>
    authController.login(req, res)
  );

  router.post("/refresh", (req, res) =>
    authController.refreshToken(req, res)
  );

  router.post("/verify", (req, res) =>
    authController.verifyToken(req, res)
  );

  // Protected routes
  router.post("/logout", authMiddleware, (req, res) =>
    authController.logout(req, res)
  );

  return router;
}
