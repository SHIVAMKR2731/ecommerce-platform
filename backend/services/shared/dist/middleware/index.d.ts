import { Request, Response, NextFunction } from "express";
import { AuthContext, UserRole } from "../types";
export declare class AppError extends Error {
    message: string;
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthContext;
            requestId?: string;
        }
    }
}
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRole: (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const generateRequestId: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=index.d.ts.map