import { Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/database";
import { publishToQueue } from "../config/rabbitmq";
import { logger } from "../../../shared/src/utils";
import { OrderStatus, PaymentStatus, DeliveryType, UserRole } from "../../../shared/src/types";
import { AppError } from "../../../shared/src/middleware";

// Validation schemas
const createOrderSchema = z.object({
  shopId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  })),
  deliveryType: z.enum(["HOME_DELIVERY", "STORE_PICKUP"]),
  deliveryAddress: z.string().optional(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  notes: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum(["PICKED", "OUT_FOR_DELIVERY", "DELIVERED"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Create order
export const createOrder = async (req: Request, res: Response) => {
  const validatedData = createOrderSchema.parse(req.body);
  const userId = req.user!.userId;

  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: true, deliveryAgent: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Get shop details
    const shop = await prisma.shop.findUnique({
      where: { id: validatedData.shopId },
      include: { vendor: { include: { user: true } } },
    });

    if (!shop) {
      throw new AppError("Shop not found", 404);
    }

    // Get products and calculate total
    let subtotal = 0;
    const orderItems = [];

    for (const item of validatedData.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.isActive || product.quantity < item.quantity) {
        throw new AppError(`Product ${product?.name || 'Unknown'} is not available`, 400);
      }

      const price = product.discountPrice || product.price;
      subtotal += price * item.quantity;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price,
      });
    }

    // Calculate delivery charge
    const deliveryCharge = validatedData.deliveryType === DeliveryType.HOME_DELIVERY ? 40 : 0;
    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount + deliveryCharge;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        shopId: validatedData.shopId,
        orderNumber,
        deliveryType: validatedData.deliveryType,
        deliveryAddress: validatedData.deliveryAddress,
        deliveryLatitude: validatedData.deliveryLatitude,
        deliveryLongitude: validatedData.deliveryLongitude,
        subtotal,
        taxAmount,
        deliveryCharge,
        totalAmount,
        notes: validatedData.notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
        user: true,
      },
    });

    // Update product quantities
    for (const item of validatedData.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Publish order created event
    await publishToQueue("order.created", {
      orderId: order.id,
      userId,
      shopId: validatedData.shopId,
      vendorId: shop.vendorId,
      totalAmount,
      orderNumber,
    });

    // Create notification for vendor
    await prisma.notification.create({
      data: {
        userId: shop.vendor.userId,
        type: "order_placed",
        title: "New Order Received",
        message: `You have received a new order #${orderNumber} for ₹${totalAmount}`,
        relatedOrderId: order.id,
        relatedUserId: userId,
      },
    });

    logger.info(`Order created: ${order.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error("Create order error", error);
    throw error;
  }
};

// Get user orders
export const getUserOrders = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  try {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
        deliveryAgent: {
          include: {
            user: true,
          },
        },
        delivery: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get user orders error", error);
    throw error;
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
        deliveryAgent: {
          include: {
            user: true,
          },
        },
        delivery: true,
        payment: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error("Get order by ID error", error);
    throw error;
  }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found or cannot be cancelled", 404);
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
      },
    });

    // Restore product quantities
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    // Publish order cancelled event
    await publishToQueue("order.cancelled", {
      orderId: id,
      userId,
      shopId: order.shopId,
      orderNumber: order.orderNumber,
    });

    logger.info(`Order cancelled: ${id} by user ${userId}`);

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    logger.error("Cancel order error", error);
    throw error;
  }
};

// Get vendor orders
export const getVendorOrders = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  try {
    // Get vendor
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new AppError("Vendor not found", 404);
    }

    // Get shops for this vendor
    const shops = await prisma.shop.findMany({
      where: { vendorId: vendor.id },
      select: { id: true },
    });

    const shopIds = shops.map(shop => shop.id);

    const where: any = {
      shopId: { in: shopIds },
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
        deliveryAgent: {
          include: {
            user: true,
          },
        },
        delivery: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get vendor orders error", error);
    throw error;
  }
};

// Update order status (vendor)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateOrderStatusSchema.parse(req.body);
  const userId = req.user!.userId;

  try {
    // Verify vendor owns the shop
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        shop: {
          include: {
            vendor: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.shop.vendor.userId !== userId) {
      throw new AppError("Unauthorized", 403);
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: validatedData.status,
        ...(validatedData.status === OrderStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
        user: true,
      },
    });

    // Publish order status updated event
    await publishToQueue("order.status_updated", {
      orderId: id,
      status: validatedData.status,
      userId: order.userId,
      shopId: order.shopId,
      orderNumber: order.orderNumber,
    });

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "order_status_updated",
        title: "Order Status Updated",
        message: `Your order #${order.orderNumber} status has been updated to ${validatedData.status}`,
        relatedOrderId: id,
      },
    });

    logger.info(`Order status updated: ${id} to ${validatedData.status}`);

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    logger.error("Update order status error", error);
    throw error;
  }
};

// Get assigned deliveries (delivery agent)
export const getAssignedDeliveries = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const deliveryAgent = await prisma.deliveryAgent.findUnique({
      where: { userId },
    });

    if (!deliveryAgent) {
      throw new AppError("Delivery agent not found", 404);
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        deliveryAgentId: deliveryAgent.id,
        status: {
          in: ["PENDING", "PICKED", "OUT_FOR_DELIVERY"],
        },
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            shop: true,
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    logger.error("Get assigned deliveries error", error);
    throw error;
  }
};

// Update delivery status
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateDeliveryStatusSchema.parse(req.body);
  const userId = req.user!.userId;

  try {
    const deliveryAgent = await prisma.deliveryAgent.findUnique({
      where: { userId },
    });

    if (!deliveryAgent) {
      throw new AppError("Delivery agent not found", 404);
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        id,
        deliveryAgentId: deliveryAgent.id,
      },
      include: {
        order: true,
      },
    });

    if (!delivery) {
      throw new AppError("Delivery not found", 404);
    }

    // Update delivery status
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: validatedData.status,
        ...(validatedData.latitude && { currentLatitude: validatedData.latitude }),
        ...(validatedData.longitude && { currentLongitude: validatedData.longitude }),
        ...(validatedData.status === "DELIVERED" && {
          actualDeliveryTime: new Date(),
        }),
      },
      include: {
        order: {
          include: {
            user: true,
            shop: true,
          },
        },
      },
    });

    // If delivered, update order status
    if (validatedData.status === "DELIVERED") {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      // Create notification for customer
      await prisma.notification.create({
        data: {
          userId: delivery.order.userId,
          type: "order_delivered",
          title: "Order Delivered",
          message: `Your order #${delivery.order.orderNumber} has been delivered successfully`,
          relatedOrderId: delivery.orderId,
        },
      });
    }

    // Publish delivery status updated event
    await publishToQueue("delivery.status_updated", {
      deliveryId: id,
      orderId: delivery.orderId,
      status: validatedData.status,
      userId: delivery.order.userId,
      shopId: delivery.order.shopId,
    });

    logger.info(`Delivery status updated: ${id} to ${validatedData.status}`);

    res.json({
      success: true,
      data: updatedDelivery,
    });
  } catch (error) {
    logger.error("Update delivery status error", error);
    throw error;
  }
};

// Get all orders (admin)
export const getAllOrders = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const shopId = req.query.shopId as string;

  try {
    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
        user: true,
        deliveryAgent: {
          include: {
            user: true,
          },
        },
        delivery: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.order.count({ where });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get all orders error", error);
    throw error;
  }
};

// Get order statistics (admin)
export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      todayOrders,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          status: "DELIVERED",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        todayOrders,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    logger.error("Get order stats error", error);
    throw error;
  }
};