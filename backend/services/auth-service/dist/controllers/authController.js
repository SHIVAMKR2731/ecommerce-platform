"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const utils_1 = require("../utils");
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(2),
    lastName: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum(["CUSTOMER", "VENDOR"]).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
class AuthController {
    constructor(redis, rabbitmq) {
        this.redis = redis;
        this.rabbitmq = rabbitmq;
    }
    async signup(req, res) {
        try {
            const data = signupSchema.parse(req.body);
            // Check if user already exists in cache or DB
            const existingUser = await this.redis.get(`email:${data.email}`);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    status: 409,
                    message: "User already exists",
                    error: "USER_EXISTS",
                    timestamp: new Date().toISOString(),
                });
            }
            // Create user
            const userId = (0, uuid_1.v4)();
            const hashedPassword = await (0, utils_1.hashPassword)(data.password);
            const user = {
                id: userId,
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone || null,
                role: data.role || "CUSTOMER",
                isVerified: false,
                createdAt: new Date(),
            };
            // Store user (in real app, use PostgreSQL)
            await this.redis.set(`user:${userId}`, JSON.stringify(user), 3600 * 24 * 30 // 30 days
            );
            await this.redis.set(`email:${data.email}`, userId);
            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokens(userId, data.email, user.role);
            // Store refresh token
            await this.redis.set(`refreshToken:${userId}`, refreshToken, 3600 * 24 * 7 // 7 days
            );
            // Publish user.registered event
            await this.rabbitmq.publish("user.registered", {
                userId,
                email: data.email,
                role: user.role,
                createdAt: new Date(),
            });
            utils_1.logger.info(`User signup: ${data.email}`);
            res.status(201).json({
                success: true,
                status: 201,
                message: "User registered successfully",
                data: {
                    userId,
                    email: data.email,
                    role: user.role,
                    accessToken,
                    refreshToken,
                    expiresIn: 900, // 15 minutes
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "Validation error",
                    error: error.errors[0].message,
                    timestamp: new Date().toISOString(),
                });
            }
            utils_1.logger.error("Signup error:", error);
            res.status(500).json({
                success: false,
                status: 500,
                message: "Internal server error",
                error: "INTERNAL_ERROR",
                timestamp: new Date().toISOString(),
            });
        }
    }
    async login(req, res) {
        try {
            const data = loginSchema.parse(req.body);
            // Get user by email
            const userId = await this.redis.get(`email:${data.email}`);
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    status: 401,
                    message: "Invalid credentials",
                    error: "INVALID_CREDENTIALS",
                    timestamp: new Date().toISOString(),
                });
            }
            const userStr = await this.redis.get(`user:${userId}`);
            const user = JSON.parse(userStr);
            // Verify password
            const isPasswordValid = await (0, utils_1.verifyPassword)(data.password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    status: 401,
                    message: "Invalid credentials",
                    error: "INVALID_CREDENTIALS",
                    timestamp: new Date().toISOString(),
                });
            }
            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokens(user.id, user.email, user.role);
            // Store refresh token
            await this.redis.set(`refreshToken:${user.id}`, refreshToken, 3600 * 24 * 7 // 7 days
            );
            utils_1.logger.info(`User login: ${data.email}`);
            res.status(200).json({
                success: true,
                status: 200,
                message: "Login successful",
                data: {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    accessToken,
                    refreshToken,
                    expiresIn: 900, // 15 minutes
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "Validation error",
                    error: error.errors[0].message,
                    timestamp: new Date().toISOString(),
                });
            }
            utils_1.logger.error("Login error:", error);
            res.status(500).json({
                success: false,
                status: 500,
                message: "Internal server error",
                error: "INTERNAL_ERROR",
                timestamp: new Date().toISOString(),
            });
        }
    }
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "Refresh token required",
                    error: "MISSING_TOKEN",
                    timestamp: new Date().toISOString(),
                });
            }
            // Verify and decode refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            // Get user
            const userStr = await this.redis.get(`user:${decoded.userId}`);
            if (!userStr) {
                return res.status(401).json({
                    success: false,
                    status: 401,
                    message: "User not found",
                    error: "USER_NOT_FOUND",
                    timestamp: new Date().toISOString(),
                });
            }
            const user = JSON.parse(userStr);
            // Verify stored refresh token matches
            const storedToken = await this.redis.get(`refreshToken:${decoded.userId}`);
            if (storedToken !== refreshToken) {
                return res.status(401).json({
                    success: false,
                    status: 401,
                    message: "Invalid refresh token",
                    error: "INVALID_TOKEN",
                    timestamp: new Date().toISOString(),
                });
            }
            // Generate new tokens
            const tokens = this.generateTokens(user.id, user.email, user.role);
            // Update refresh token
            await this.redis.set(`refreshToken:${user.id}`, tokens.refreshToken, 3600 * 24 * 7);
            utils_1.logger.info(`Token refresh: ${user.email}`);
            res.status(200).json({
                success: true,
                status: 200,
                message: "Token refreshed",
                data: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: 900,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            utils_1.logger.error("Token refresh error:", error);
            res.status(401).json({
                success: false,
                status: 401,
                message: "Invalid refresh token",
                error: "INVALID_TOKEN",
                timestamp: new Date().toISOString(),
            });
        }
    }
    async logout(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "User not found",
                    error: "USER_NOT_FOUND",
                    timestamp: new Date().toISOString(),
                });
            }
            // Remove refresh token
            await this.redis.delete(`refreshToken:${userId}`);
            utils_1.logger.info(`User logout: ${userId}`);
            res.status(200).json({
                success: true,
                status: 200,
                message: "Logout successful",
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            utils_1.logger.error("Logout error:", error);
            res.status(500).json({
                success: false,
                status: 500,
                message: "Internal server error",
                error: "INTERNAL_ERROR",
                timestamp: new Date().toISOString(),
            });
        }
    }
    async verifyToken(req, res) {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    status: 401,
                    message: "No token provided",
                    error: "NO_TOKEN",
                    timestamp: new Date().toISOString(),
                });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            res.status(200).json({
                success: true,
                status: 200,
                message: "Token valid",
                data: {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            utils_1.logger.error("Token verification error:", error);
            res.status(401).json({
                success: false,
                status: 401,
                message: "Invalid token",
                error: "INVALID_TOKEN",
                timestamp: new Date().toISOString(),
            });
        }
    }
    generateTokens(userId, email, role) {
        const accessToken = (0, utils_1.generateAccessToken)(userId, email, role);
        const refreshToken = (0, utils_1.generateRefreshToken)(userId, 1); // tokenVersion = 1
        return { accessToken, refreshToken };
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map