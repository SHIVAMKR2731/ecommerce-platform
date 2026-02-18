"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../../shared/src/middleware");
const types_1 = require("../../../shared/src/types");
const deliveryController = __importStar(require("../controllers/deliveryController"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middleware_1.authMiddleware);
// Admin routes
router.post("/assign", (0, middleware_1.requireRole)(types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(deliveryController.assignDelivery));
router.get("/admin/all", (0, middleware_1.requireRole)(types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(deliveryController.getAllDeliveries));
router.get("/admin/agents", (0, middleware_1.requireRole)(types_1.UserRole.ADMIN), (0, middleware_1.asyncHandler)(deliveryController.getDeliveryAgents));
// Delivery agent routes
router.get("/agent/assigned", (0, middleware_1.requireRole)(types_1.UserRole.DELIVERY_AGENT), (0, middleware_1.asyncHandler)(deliveryController.getAssignedDeliveries));
router.put("/:id/status", (0, middleware_1.requireRole)(types_1.UserRole.DELIVERY_AGENT), (0, middleware_1.asyncHandler)(deliveryController.updateDeliveryStatus));
router.put("/:id/location", (0, middleware_1.requireRole)(types_1.UserRole.DELIVERY_AGENT), (0, middleware_1.asyncHandler)(deliveryController.updateDeliveryLocation));
// Vendor routes
router.get("/vendor/pending", (0, middleware_1.requireRole)(types_1.UserRole.VENDOR), (0, middleware_1.asyncHandler)(deliveryController.getPendingDeliveriesForVendor));
exports.default = router;
//# sourceMappingURL=deliveryRoutes.js.map