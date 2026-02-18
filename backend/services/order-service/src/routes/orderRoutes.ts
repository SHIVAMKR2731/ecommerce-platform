import { Router } from "express";
import { authMiddleware, requireRole, asyncHandler } from "../../../shared/src/middleware";
import { UserRole } from "../../../shared/src/types";
import * as orderController from "../controllers/orderController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Customer routes
router.post("/", requireRole(UserRole.CUSTOMER), asyncHandler(orderController.createOrder));
router.get("/my-orders", requireRole(UserRole.CUSTOMER), asyncHandler(orderController.getUserOrders));
router.get("/:id", requireRole(UserRole.CUSTOMER), asyncHandler(orderController.getOrderById));
router.put("/:id/cancel", requireRole(UserRole.CUSTOMER), asyncHandler(orderController.cancelOrder));

// Vendor routes
router.get("/vendor/orders", requireRole(UserRole.VENDOR), asyncHandler(orderController.getVendorOrders));
router.put("/:id/status", requireRole(UserRole.VENDOR), asyncHandler(orderController.updateOrderStatus));

// Delivery agent routes
router.get("/delivery/assigned", requireRole(UserRole.DELIVERY_AGENT), asyncHandler(orderController.getAssignedDeliveries));
router.put("/:id/delivery-status", requireRole(UserRole.DELIVERY_AGENT), asyncHandler(orderController.updateDeliveryStatus));

// Admin routes
router.get("/admin/all", requireRole(UserRole.ADMIN), asyncHandler(orderController.getAllOrders));
router.get("/admin/stats", requireRole(UserRole.ADMIN), asyncHandler(orderController.getOrderStats));

export default router;