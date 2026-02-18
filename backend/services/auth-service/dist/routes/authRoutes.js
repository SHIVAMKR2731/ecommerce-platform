"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthRoutes = createAuthRoutes;
// src/routes/authRoutes.ts
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
function createAuthRoutes(redis, rabbitmq) {
    const router = (0, express_1.Router)();
    const authController = new authController_1.AuthController(redis, rabbitmq);
    // Public routes
    router.post("/signup", (req, res) => authController.signup(req, res));
    router.post("/login", (req, res) => authController.login(req, res));
    router.post("/refresh", (req, res) => authController.refreshToken(req, res));
    router.post("/verify", (req, res) => authController.verifyToken(req, res));
    // Protected routes
    router.post("/logout", auth_1.authMiddleware, (req, res) => authController.logout(req, res));
    return router;
}
//# sourceMappingURL=authRoutes.js.map