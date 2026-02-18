import { Response } from "express";
import { RedisClient } from "../services/redis";
import { RabbitMQService } from "../services/rabbitmq";
import { AuthRequest } from "../types";
export declare class AuthController {
    private redis;
    private rabbitmq;
    constructor(redis: RedisClient, rabbitmq: RabbitMQService);
    signup(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    login(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    refreshToken(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    logout(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    verifyToken(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    private generateTokens;
}
//# sourceMappingURL=authController.d.ts.map