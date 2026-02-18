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
exports.consumeFromQueue = exports.publishToQueue = exports.getChannel = exports.connectRabbitMQ = void 0;
const amqp = __importStar(require("amqplib"));
const utils_1 = require("../../../shared/src/utils");
let connection;
let channel;
const connectRabbitMQ = async () => {
    try {
        const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
        connection = await amqp.connect(url);
        channel = await connection.createChannel();
        utils_1.logger.info("Connected to RabbitMQ");
    }
    catch (error) {
        utils_1.logger.error("Failed to connect to RabbitMQ", error);
        throw error;
    }
};
exports.connectRabbitMQ = connectRabbitMQ;
const getChannel = () => {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialized");
    }
    return channel;
};
exports.getChannel = getChannel;
const publishToQueue = async (queue, message) => {
    try {
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            persistent: true,
        });
    }
    catch (error) {
        utils_1.logger.error("Failed to publish message to queue", error);
        throw error;
    }
};
exports.publishToQueue = publishToQueue;
const consumeFromQueue = async (queue, callback) => {
    try {
        await channel.assertQueue(queue, { durable: true });
        channel.consume(queue, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await callback(content);
                    channel.ack(msg);
                }
                catch (error) {
                    utils_1.logger.error("Failed to process message", error);
                    channel.nack(msg, false, false);
                }
            }
        });
    }
    catch (error) {
        utils_1.logger.error("Failed to consume from queue", error);
        throw error;
    }
};
exports.consumeFromQueue = consumeFromQueue;
//# sourceMappingURL=rabbitmq.js.map