export declare class RabbitMQService {
    private connection;
    private channel;
    private isConnected;
    connect(): Promise<void>;
    publish(queue: string, message: any): Promise<void>;
    subscribe(queue: string, callback: (message: any) => Promise<void>): Promise<void>;
    disconnect(): Promise<void>;
    isHealthy(): boolean;
}
//# sourceMappingURL=rabbitmq.d.ts.map