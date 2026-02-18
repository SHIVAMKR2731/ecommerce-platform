export declare class RedisClient {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<string | null>;
    delete(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    disconnect(): Promise<void>;
    isHealthy(): boolean;
}
//# sourceMappingURL=redis.d.ts.map