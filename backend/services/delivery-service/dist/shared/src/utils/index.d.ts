import winston from "winston";
import { Response } from "express";
export declare const createLogger: (serviceName: string) => winston.Logger;
export declare const logger: winston.Logger;
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => void;
export declare const sendPaginated: <T>(res: Response, data: T[], pagination: {
    page: number;
    limit: number;
    total: number;
}, statusCode?: number) => void;
export declare const validatePagination: (page?: any, limit?: any) => {
    page: number;
    limit: number;
};
export declare const calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
export declare const generateRefreshToken: (userId: string, tokenVersion: number) => string;
export declare const generateAccessToken: (userId: string, email: string, role: string) => string;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const createRateLimiter: (maxRequests: number, windowMs: number) => (identifier: string) => boolean;
export declare function retry<T>(fn: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<T>;
//# sourceMappingURL=index.d.ts.map