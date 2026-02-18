import { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        email: string;
    };
}
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map