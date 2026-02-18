// src/services/redis.ts
import { createClient, RedisClientType } from "redis";
import { logger } from "../utils/logger";

export class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = null as any; // Will be initialized in connect()
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || "redis://redis:6379",
      });

      this.client.on("error", (err) => logger.error("Redis error:", err));
      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Redis connected");
      });

      await this.client.connect();
    } catch (error) {
      logger.error("Redis connection error:", error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    ttl?: number
  ): Promise<string | null> {
    try {
      if (ttl) {
        return await this.client.setEx(key, ttl, value);
      }
      return await this.client.set(key, value);
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Redis incr error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return Boolean(result);
    } catch (error) {
      logger.error(`Redis expire error for key ${key}:`, error);
      return false;
    }
  }

  async disconnect() {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info("Redis disconnected");
    } catch (error) {
      logger.error("Redis disconnection error:", error);
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}
