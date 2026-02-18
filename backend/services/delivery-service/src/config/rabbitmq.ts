import * as amqp from "amqplib";
import { logger } from "../../../shared/src/utils";

let connection: any;
let channel: any;

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    logger.info("Connected to RabbitMQ");
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", error);
    throw error;
  }
};

export const getChannel = (): amqp.Channel => {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  return channel;
};

export const publishToQueue = async (queue: string, message: any): Promise<void> => {
  try {
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  } catch (error) {
    logger.error("Failed to publish message to queue", error);
    throw error;
  }
};

export const consumeFromQueue = async (
  queue: string,
  callback: (message: any) => Promise<void>
): Promise<void> => {
  try {
    await channel.assertQueue(queue, { durable: true });
    channel.consume(queue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
        } catch (error) {
          logger.error("Failed to process message", error);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    logger.error("Failed to consume from queue", error);
    throw error;
  }
};