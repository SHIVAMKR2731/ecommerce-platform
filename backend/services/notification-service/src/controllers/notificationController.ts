import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { publishToQueue } from "../config/rabbitmq";
import { emitToUser } from "../socket/socketHandlers";
import { logger } from "../../../shared/src/utils";
import { UserRole } from "../../../shared/src/types";
import { AppError } from "../../../shared/src/middleware";

// Validation schemas
const sendNotificationSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  relatedOrderId: z.string().optional(),
  relatedUserId: z.string().optional(),
});

// Get user notifications
export const getUserNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const unreadOnly = req.query.unreadOnly === "true";

  try {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.notification.count({ where });
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    logger.error("Get user notifications error", error);
    throw error;
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    logger.error("Mark as read error", error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    logger.error("Mark all as read error", error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    logger.error("Delete notification error", error);
    throw error;
  }
};

// Send notification (admin)
export const sendNotification = async (req: Request, res: Response) => {
  const validatedData = sendNotificationSchema.parse(req.body);

  try {
    // Verify admin role
    if (req.user!.role !== UserRole.ADMIN) {
      throw new AppError("Unauthorized", 403);
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        relatedOrderId: validatedData.relatedOrderId,
        relatedUserId: validatedData.relatedUserId,
      },
    });

    // Send real-time notification
    emitToUser(validatedData.userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    // Send email/SMS if needed (implement based on user preferences)
    // await sendEmailNotification(notification);
    // await sendSMSNotification(notification);

    logger.info(`Admin notification sent to user ${validatedData.userId}`);

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error("Send notification error", error);
    throw error;
  }
};