import { Router } from "express";
import { authMiddleware, requireRole, asyncHandler } from "../../../shared/src/middleware";
import { UserRole } from "../../../shared/src/types";
import * as deliveryController from "../controllers/deliveryController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Admin routes
router.post("/assign", requireRole(UserRole.ADMIN), asyncHandler(deliveryController.assignDelivery));
router.get("/admin/all", requireRole(UserRole.ADMIN), asyncHandler(deliveryController.getAllDeliveries));
router.get("/admin/agents", requireRole(UserRole.ADMIN), asyncHandler(deliveryController.getDeliveryAgents));

// Delivery agent routes
router.get("/agent/assigned", requireRole(UserRole.DELIVERY_AGENT), asyncHandler(deliveryController.getAssignedDeliveries));
router.put("/:id/status", requireRole(UserRole.DELIVERY_AGENT), asyncHandler(deliveryController.updateDeliveryStatus));
router.put("/:id/location", requireRole(UserRole.DELIVERY_AGENT), asyncHandler(deliveryController.updateDeliveryLocation));

// Vendor routes
router.get("/vendor/pending", requireRole(UserRole.VENDOR), asyncHandler(deliveryController.getPendingDeliveriesForVendor));

export default router;