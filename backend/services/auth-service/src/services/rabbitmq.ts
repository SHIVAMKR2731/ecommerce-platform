// src/services/rabbitmq.ts
import * as amqp from "amqplib";
import { logger } from "../utils/logger";

export class RabbitMQService {
  private connection: any = null;
  private channel: any = null;
  private isConnected: boolean = false;

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672";
      this.connection = await amqp.connect(url);

      this.connection.on("error", (err: any) => {
        logger.error("RabbitMQ connection error:", err);
        this.isConnected = false;
      });

      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed");
        this.isConnected = false;
      });

      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      logger.info("RabbitMQ connected");
    } catch (error) {
      logger.error("RabbitMQ connection error:", error);
      throw error;
    }
  }

  async publish(queue: string, message: any) {
    try {
      if (!this.channel) {
        throw new Error("RabbitMQ channel not initialized");
      }

      await this.channel.assertQueue(queue, { durable: true });
      const success = this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      if (!success) {
        logger.warn(`Failed to send message to queue: ${queue}`);
      }

      logger.info(`Message published to ${queue}`, message);
    } catch (error) {
      logger.error(`Error publishing to queue ${queue}:`, error);
      throw error;
    }
  }

  async subscribe(
    queue: string,
    callback: (message: any) => Promise<void>
  ) {
    try {
      if (!this.channel) {
        throw new Error("RabbitMQ channel not initialized");
      }

      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.prefetch(1);

      this.channel.consume(queue, async (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            this.channel!.ack(msg);
          } catch (error) {
            logger.error(`Error processing message from ${queue}:`, error);
            this.channel!.nack(msg, false, true); // Requeue
          }
        }
      });

      logger.info(`Subscribed to queue: ${queue}`);
    } catch (error) {
      logger.error(`Error subscribing to queue ${queue}:`, error);
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
      logger.info("RabbitMQ disconnected");
    } catch (error) {
      logger.error("RabbitMQ disconnection error:", error);
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}
