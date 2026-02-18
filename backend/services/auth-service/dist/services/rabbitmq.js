"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
// src/services/rabbitmq.ts
const amqp = __importStar(require("amqplib"));
const logger_1 = require("../utils/logger");
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }
    async connect() {
        try {
            const url = process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";
            this.connection = await amqp.connect(url);
            this.connection.on("error", (err) => {
                logger_1.logger.error("RabbitMQ connection error:", err);
                this.isConnected = false;
            });
            this.connection.on("close", () => {
                logger_1.logger.warn("RabbitMQ connection closed");
                this.isConnected = false;
            });
            this.channel = await this.connection.createChannel();
            this.isConnected = true;
            logger_1.logger.info("RabbitMQ connected");
        }
        catch (error) {
            logger_1.logger.error("RabbitMQ connection error:", error);
            throw error;
        }
    }
    async publish(queue, message) {
        try {
            if (!this.channel) {
                throw new Error("RabbitMQ channel not initialized");
            }
            await this.channel.assertQueue(queue, { durable: true });
            const success = this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
            if (!success) {
                logger_1.logger.warn(`Failed to send message to queue: ${queue}`);
            }
            logger_1.logger.info(`Message published to ${queue}`, message);
        }
        catch (error) {
            logger_1.logger.error(`Error publishing to queue ${queue}:`, error);
            throw error;
        }
    }
    async subscribe(queue, callback) {
        try {
            if (!this.channel) {
                throw new Error("RabbitMQ channel not initialized");
            }
            await this.channel.assertQueue(queue, { durable: true });
            await this.channel.prefetch(1);
            this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        this.channel.ack(msg);
                    }
                    catch (error) {
                        logger_1.logger.error(`Error processing message from ${queue}:`, error);
                        this.channel.nack(msg, false, true); // Requeue
                    }
                }
            });
            logger_1.logger.info(`Subscribed to queue: ${queue}`);
        }
        catch (error) {
            logger_1.logger.error(`Error subscribing to queue ${queue}:`, error);
            throw error;
        }
    }
    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            logger_1.logger.info("RabbitMQ disconnected");
        }
        catch (error) {
            logger_1.logger.error("RabbitMQ disconnection error:", error);
        }
    }
    isHealthy() {
        return this.isConnected;
    }
}
exports.RabbitMQService = RabbitMQService;
//# sourceMappingURL=rabbitmq.js.map