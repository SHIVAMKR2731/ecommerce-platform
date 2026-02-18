"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
const utils_1 = require("../../../shared/src/utils");
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});
const connectRedis = async () => {
    try {
        await exports.redisClient.connect();
        utils_1.logger.info("Connected to Redis");
    }
    catch (error) {
        utils_1.logger.error("Failed to connect to Redis", error);
        throw error;
    }
};
exports.connectRedis = connectRedis;
exports.redisClient.on("error", (err) => {
    utils_1.logger.error("Redis Client Error", err);
});
exports.default = exports.redisClient;
//# sourceMappingURL=redis.js.map