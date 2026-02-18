import * as amqp from "amqplib";
export declare const connectRabbitMQ: () => Promise<void>;
export declare const getChannel: () => amqp.Channel;
export declare const publishToQueue: (queue: string, message: any) => Promise<void>;
export declare const consumeFromQueue: (queue: string, callback: (message: any) => Promise<void>) => Promise<void>;
//# sourceMappingURL=rabbitmq.d.ts.map