import { Router } from "express";
import { RedisClient } from "../services/redis";
import { RabbitMQService } from "../services/rabbitmq";
export declare function createAuthRoutes(redis: RedisClient, rabbitmq: RabbitMQService): Router;
//# sourceMappingURL=authRoutes.d.ts.map