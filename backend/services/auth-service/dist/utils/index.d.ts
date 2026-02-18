import winston from "winston";
export declare const createLogger: (serviceName: string) => winston.Logger;
export declare const logger: winston.Logger;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateRefreshToken: (userId: string, tokenVersion: number) => string;
export declare const generateAccessToken: (userId: string, email: string, role: string) => string;
//# sourceMappingURL=index.d.ts.map