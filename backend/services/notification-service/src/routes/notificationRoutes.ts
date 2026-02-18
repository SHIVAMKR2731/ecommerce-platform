import { Router } from "express";
import { authMiddleware, asyncHandler } from "../../../shared/src/middleware";
import * as notificationController from "../controllers/notificationController";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// User routes
router.get("/", asyncHandler(notificationController.getUserNotifications));
router.put("/:id/read", asyncHandler(notificationController.markAsRead));
router.put("/read-all", asyncHandler(notificationController.markAllAsRead));
router.delete("/:id", asyncHandler(notificationController.deleteNotification));

// Admin routes
router.post("/admin/send", asyncHandler(notificationController.sendNotification));

export default router;