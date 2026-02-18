import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { publishToQueue } from "../config/rabbitmq";
import { logger } from "../../../shared/src/utils";
import { OrderStatus } from "../../../shared/src/types";
import { AppError } from "../../../shared/src/middleware";

// Validation schemas
const assignDeliverySchema = z.object({
  orderId: z.string(),
  deliveryAgentId: z.string().optional(), // If not provided, auto-assign
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum(["PENDING", "PICKED", "OUT_FOR_DELIVERY", "DELIVERED"]),
});

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// Assign delivery (admin)
export const assignDelivery = async (req: Request, res: Response) => {
  const validatedData = assignDeliverySchema.parse(req.body);

  try {
    // Check if order exists and is ready for delivery
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        shop: true,
        user: true,
        delivery: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.status !== OrderStatus.READY) {
      throw new AppError("Order is not ready for delivery", 400);
    }

    if (order.delivery) {
      throw new AppError("Delivery already assigned", 400);
    }

    let deliveryAgentId = validatedData.deliveryAgentId;

    // Auto-assign if not provided
    if (!deliveryAgentId) {
      const agentId = await findNearestAvailableAgent(
        order.shop.latitude,
        order.shop.longitude
      );

      if (!agentId) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: "No available delivery agents found",
          timestamp: new Date().toISOString(),
        });
      }

      deliveryAgentId = agentId;
    }

    // Verify delivery agent exists and is active
    const deliveryAgent = await prisma.deliveryAgent.findUnique({
      where: { id: deliveryAgentId },
      include: { user: true },
    });

    if (!deliveryAgent || !deliveryAgent.isActive) {
      throw new AppError("Delivery agent not found or inactive", 404);
    }

    // Create delivery
    const delivery = await prisma.delivery.create({
      data: {
        orderId: validatedData.orderId,
        deliveryAgentId,
        pickupLatitude: order.shop.latitude,
        pickupLongitude: order.shop.longitude,
        currentLatitude: deliveryAgent.currentLatitude,
        currentLongitude: deliveryAgent.currentLongitude,
      },
      include: {
        order: {
          include: {
            shop: true,
            user: true,
          },
        },
        deliveryAgent: {
          include: {
            user: true,
          },
        },
      },
    });

    // Update order with delivery agent
    await prisma.order.update({
      where: { id: validatedData.orderId },
      data: {
        deliveryAgentId,
        status: OrderStatus.OUT_FOR_DELIVERY,
      },
    });

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: deliveryAgent.userId,
        type: "delivery_assigned",
        title: "New Delivery Assigned",
        message: `You have been assigned a new delivery for order #${order.orderNumber}`,
        relatedOrderId: validatedData.orderId,
      },
    });

    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "delivery_assigned",
        title: "Delivery Agent Assigned",
        message: `A delivery agent has been assigned to your order #${order.orderNumber}`,
        relatedOrderId: validatedData.orderId,
      },
    });

    // Publish delivery assigned event
    await publishToQueue("delivery.assigned", {
      deliveryId: delivery.id,
      orderId: validatedData.orderId,
      deliveryAgentId,
      userId: order.userId,
      shopId: order.shopId,
    });

    logger.info(`Delivery assigned: ${delivery.id} for order ${validatedData.orderId}`);

    res.status(201).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    logger.error("Assign delivery error", error);
    throw error;
  }
};

// Find nearest available delivery agent
async function findNearestAvailableAgent(shopLat: number, shopLng: number): Promise<string | null> {
  try {
    // Get all active delivery agents
    const agents = await prisma.deliveryAgent.findMany({
      where: {
        isActive: true,
        user: {
          isActive: true,
        },
      },
      include: {
        user: true,
        deliveries: {
          where: {
            status: {
              in: ["PENDING", "PICKED", "OUT_FOR_DELIVERY"],
            },
          },
        },
      },
    });

    // Filter agents with less than 3 active deliveries
    const availableAgents = agents.filter((agent: any) => agent.deliveries.length < 3);

    if (availableAgents.length === 0) {
      return null;
    }

    // Find the nearest agent
    let nearestAgent = null;
    let minDistance = Infinity;

    for (const agent of availableAgents) {
      if (agent.currentLatitude && agent.currentLongitude) {
        const distance = calculateDistance(
          shopLat,
          shopLng,
          agent.currentLatitude,
          agent.currentLongitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestAgent = agent;
        }
      }
    }

    return nearestAgent ? nearestAgent.id : availableAgents[0].id; // Fallback to first available
  } catch (error) {
    logger.error("Find nearest agent error", error);
    return null;
  }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Get all deliveries (admin)
export const getAllDeliveries = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  try {
    const where: any = {};
    if (status) where.status = status;

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
          include: {
            shop: true,
            user: true,
          },
        },
        deliveryAgent: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.delivery.count({ where });

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get all deliveries error", error);
    throw error;
  }
};

// Get delivery agents (admin)
export const getDeliveryAgents = async (req: Request, res: Response) => {
  try {
    const agents = await prisma.deliveryAgent.findMany({
      include: {
        user: true,
        deliveries: {
          where: {
            status: {
              in: ["PENDING", "PICKED", "OUT_FOR_DELIVERY"],
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Add computed fields
    const agentsWithStats = agents.map((agent: any) => ({
      ...agent,
      activeDeliveries: agent.deliveries.length,
      isAvailable: agent.deliveries.length < 3 && agent.isActive,
    }));

    res.json({
      success: true,
      data: agentsWithStats,
    });
  } catch (error) {
    logger.error("Get delivery agents error", error);
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

// Update delivery status (delivery agent)
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

// Update delivery location (delivery agent)
export const updateDeliveryLocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateLocationSchema.parse(req.body);
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
    });

    if (!delivery) {
      throw new AppError("Delivery not found", 404);
    }

    // Update delivery location
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        currentLatitude: validatedData.latitude,
        currentLongitude: validatedData.longitude,
      },
    });

    // Update agent location
    await prisma.deliveryAgent.update({
      where: { id: deliveryAgent.id },
      data: {
        currentLatitude: validatedData.latitude,
        currentLongitude: validatedData.longitude,
      },
    });

    // Publish location update event
    await publishToQueue("delivery.location_updated", {
      deliveryId: id,
      orderId: delivery.orderId,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
    });

    res.json({
      success: true,
      data: updatedDelivery,
    });
  } catch (error) {
    logger.error("Update delivery location error", error);
    throw error;
  }
};

// Get pending deliveries for vendor
export const getPendingDeliveriesForVendor = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
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

    const shopIds = shops.map((shop: any) => shop.id);

    const deliveries = await prisma.delivery.findMany({
      where: {
        order: {
          shopId: { in: shopIds },
          status: OrderStatus.READY,
        },
        status: "PENDING",
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
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
    logger.error("Get pending deliveries for vendor error", error);
    throw error;
  }
};