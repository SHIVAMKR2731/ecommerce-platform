"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
// src/services/redis.ts
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RedisClient {
    constructor() {
        this.isConnected = false;
        this.client = null; // Will be initialized in connect()
    }
    async connect() {
        try {
            this.client = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || "redis://redis:6379",
            });
            this.client.on("error", (err) => logger_1.logger.error("Redis error:", err));
            this.client.on("connect", () => {
                this.isConnected = true;
                logger_1.logger.info("Redis connected");
            });
            await this.client.connect();
        }
        catch (error) {
            logger_1.logger.error("Redis connection error:", error);
            throw error;
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            if (ttl) {
                return await this.client.setEx(key, ttl, value);
            }
            return await this.client.set(key, value);
        }
        catch (error) {
            logger_1.logger.error(`Redis set error for key ${key}:`, error);
            return null;
        }
    }
    async delete(key) {
        try {
            return await this.client.del(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis delete error for key ${key}:`, error);
            return 0;
        }
    }
    async incr(key) {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis incr error for key ${key}:`, error);
            return 0;
        }
    }
    async expire(key, seconds) {
        try {
            const result = await this.client.expire(key, seconds);
            return Boolean(result);
        }
        catch (error) {
            logger_1.logger.error(`Redis expire error for key ${key}:`, error);
            return false;
        }
    }
    async disconnect() {
        try {
            await this.client.disconnect();
            this.isConnected = false;
            logger_1.logger.info("Redis disconnected");
        }
        catch (error) {
            logger_1.logger.error("Redis disconnection error:", error);
        }
    }
    isHealthy() {
        return this.isConnected;
    }
}
exports.RedisClient = RedisClient;
//# sourceMappingURL=redis.js.map