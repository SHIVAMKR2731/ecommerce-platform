import { Request } from "express";
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        email: string;
    };
}
export interface SignupPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
}
export interface LoginPayload {
    email: string;
    password: string;
}
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
//# sourceMappingURL=types.d.ts.map