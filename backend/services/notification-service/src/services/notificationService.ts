import { prisma } from "../config/database";
import { emitToUser } from "../socket/socketHandlers";
import { logger } from "../../../shared/src/utils";

// Handle notification events from message queues
export const handleNotificationEvents = async (event: any): Promise<void> => {
  try {
    switch (event.type || event.eventType) {
      case "order.created":
        await handleOrderCreated(event);
        break;
      case "order.status_updated":
        await handleOrderStatusUpdated(event);
        break;
      case "order.cancelled":
        await handleOrderCancelled(event);
        break;
      case "delivery.assigned":
        await handleDeliveryAssigned(event);
        break;
      case "delivery.status_updated":
        await handleDeliveryStatusUpdated(event);
        break;
      case "payment.completed":
        await handlePaymentCompleted(event);
        break;
      case "payment.failed":
        await handlePaymentFailed(event);
        break;
      default:
        logger.warn(`Unknown event type: ${event.type || event.eventType}`);
    }
  } catch (error) {
    logger.error("Handle notification event error", error);
  }
};

// Order created event
async function handleOrderCreated(event: any) {
  const { orderId, userId, shopId, vendorId, totalAmount, orderNumber } = event;

  try {
    // Notification for vendor (already created in order service)
    // Notification for customer
    const customerNotification = await prisma.notification.create({
      data: {
        userId,
        type: "order_placed",
        title: "Order Placed Successfully",
        message: `Your order #${orderNumber} has been placed successfully for ₹${totalAmount}`,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: customerNotification.id,
      type: customerNotification.type,
      title: customerNotification.title,
      message: customerNotification.message,
      createdAt: customerNotification.createdAt,
    });

    logger.info(`Order created notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Handle order created event error", error);
  }
}

// Order status updated event
async function handleOrderStatusUpdated(event: any) {
  const { orderId, status, userId, shopId, orderNumber } = event;

  try {
    let title = "";
    let message = "";

    switch (status) {
      case "CONFIRMED":
        title = "Order Confirmed";
        message = `Your order #${orderNumber} has been confirmed by the vendor`;
        break;
      case "PREPARING":
        title = "Order Being Prepared";
        message = `Your order #${orderNumber} is being prepared`;
        break;
      case "READY":
        title = "Order Ready for Pickup/Delivery";
        message = `Your order #${orderNumber} is ready for pickup/delivery`;
        break;
      case "OUT_FOR_DELIVERY":
        title = "Order Out for Delivery";
        message = `Your order #${orderNumber} is out for delivery`;
        break;
      case "DELIVERED":
        title = "Order Delivered";
        message = `Your order #${orderNumber} has been delivered successfully`;
        break;
      default:
        return; // Don't send notification for other statuses
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "order_status_updated",
        title,
        message,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    // Also emit order status update for real-time tracking
    emitToUser(userId, "order_status_update", {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Order status notification sent to user ${userId}: ${status}`);
  } catch (error) {
    logger.error("Handle order status updated event error", error);
  }
}

// Order cancelled event
async function handleOrderCancelled(event: any) {
  const { orderId, userId, shopId, orderNumber } = event;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "order_cancelled",
        title: "Order Cancelled",
        message: `Your order #${orderNumber} has been cancelled`,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    logger.info(`Order cancelled notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Handle order cancelled event error", error);
  }
}

// Delivery assigned event
async function handleDeliveryAssigned(event: any) {
  const { deliveryId, orderId, deliveryAgentId, userId, shopId } = event;

  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    if (!order) return;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "delivery_assigned",
        title: "Delivery Agent Assigned",
        message: `A delivery agent has been assigned to your order #${order.orderNumber}`,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    logger.info(`Delivery assigned notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Handle delivery assigned event error", error);
  }
}

// Delivery status updated event
async function handleDeliveryStatusUpdated(event: any) {
  const { deliveryId, orderId, status, userId, shopId } = event;

  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    if (!order) return;

    let title = "";
    let message = "";

    switch (status) {
      case "PICKED":
        title = "Order Picked Up";
        message = `Your order #${order.orderNumber} has been picked up by the delivery agent`;
        break;
      case "OUT_FOR_DELIVERY":
        title = "Out for Delivery";
        message = `Your order #${order.orderNumber} is out for delivery`;
        break;
      case "DELIVERED":
        title = "Order Delivered";
        message = `Your order #${order.orderNumber} has been delivered successfully`;
        break;
      default:
        return;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "delivery_status_updated",
        title,
        message,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    // Emit delivery status update
    emitToUser(userId, "delivery_status_update", {
      orderId,
      deliveryStatus: status,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Delivery status notification sent to user ${userId}: ${status}`);
  } catch (error) {
    logger.error("Handle delivery status updated event error", error);
  }
}

// Payment completed event
async function handlePaymentCompleted(event: any) {
  const { orderId, userId, amount, orderNumber } = event;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "payment_completed",
        title: "Payment Successful",
        message: `Payment of ₹${amount} for order #${orderNumber} has been processed successfully`,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    logger.info(`Payment completed notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Handle payment completed event error", error);
  }
}

// Payment failed event
async function handlePaymentFailed(event: any) {
  const { orderId, userId, amount, orderNumber, reason } = event;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: "payment_failed",
        title: "Payment Failed",
        message: `Payment of ₹${amount} for order #${orderNumber} failed. ${reason || "Please try again"}`,
        relatedOrderId: orderId,
      },
    });

    // Send real-time notification
    emitToUser(userId, "new_notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    });

    logger.info(`Payment failed notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Handle payment failed event error", error);
  }
}