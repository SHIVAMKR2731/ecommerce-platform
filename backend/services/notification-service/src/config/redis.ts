import { createClient } from "redis";
import { logger } from "../../../shared/src/utils";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info("Connected to Redis");
  } catch (error) {
    logger.error("Failed to connect to Redis", error);
    throw error;
  }
};

redisClient.on("error", (err) => {
  logger.error("Redis Client Error", err);
});

export default redisClient;