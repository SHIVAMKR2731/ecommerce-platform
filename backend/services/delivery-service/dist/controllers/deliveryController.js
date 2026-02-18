"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingDeliveriesForVendor = exports.updateDeliveryLocation = exports.updateDeliveryStatus = exports.getAssignedDeliveries = exports.getDeliveryAgents = exports.getAllDeliveries = exports.assignDelivery = void 0;
const zod_1 = require("zod");
const database_1 = require("../config/database");
const rabbitmq_1 = require("../config/rabbitmq");
const utils_1 = require("../../../shared/src/utils");
const types_1 = require("../../../shared/src/types");
const middleware_1 = require("../../../shared/src/middleware");
// Validation schemas
const assignDeliverySchema = zod_1.z.object({
    orderId: zod_1.z.string(),
    deliveryAgentId: zod_1.z.string().optional(), // If not provided, auto-assign
});
const updateDeliveryStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "PICKED", "OUT_FOR_DELIVERY", "DELIVERED"]),
});
const updateLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
});
// Assign delivery (admin)
const assignDelivery = async (req, res) => {
    const validatedData = assignDeliverySchema.parse(req.body);
    try {
        // Check if order exists and is ready for delivery
        const order = await database_1.prisma.order.findUnique({
            where: { id: validatedData.orderId },
            include: {
                shop: true,
                user: true,
                delivery: true,
            },
        });
        if (!order) {
            throw new middleware_1.AppError("Order not found", 404);
        }
        if (order.status !== types_1.OrderStatus.READY) {
            throw new middleware_1.AppError("Order is not ready for delivery", 400);
        }
        if (order.delivery) {
            throw new middleware_1.AppError("Delivery already assigned", 400);
        }
        let deliveryAgentId = validatedData.deliveryAgentId;
        // Auto-assign if not provided
        if (!deliveryAgentId) {
            deliveryAgentId = await findNearestAvailableAgent(order.shop.latitude, order.shop.longitude);
            if (!deliveryAgentId) {
                throw new middleware_1.AppError("No available delivery agents found", 400);
            }
        }
        // Verify delivery agent exists and is active
        const deliveryAgent = await database_1.prisma.deliveryAgent.findUnique({
            where: { id: deliveryAgentId },
            include: { user: true },
        });
        if (!deliveryAgent || !deliveryAgent.isActive) {
            throw new middleware_1.AppError("Delivery agent not found or inactive", 404);
        }
        // Create delivery
        const delivery = await database_1.prisma.delivery.create({
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
        await database_1.prisma.order.update({
            where: { id: validatedData.orderId },
            data: {
                deliveryAgentId,
                status: types_1.OrderStatus.OUT_FOR_DELIVERY,
            },
        });
        // Create notifications
        await database_1.prisma.notification.create({
            data: {
                userId: deliveryAgent.userId,
                type: "delivery_assigned",
                title: "New Delivery Assigned",
                message: `You have been assigned a new delivery for order #${order.orderNumber}`,
                relatedOrderId: validatedData.orderId,
            },
        });
        await database_1.prisma.notification.create({
            data: {
                userId: order.userId,
                type: "delivery_assigned",
                title: "Delivery Agent Assigned",
                message: `A delivery agent has been assigned to your order #${order.orderNumber}`,
                relatedOrderId: validatedData.orderId,
            },
        });
        // Publish delivery assigned event
        await (0, rabbitmq_1.publishToQueue)("delivery.assigned", {
            deliveryId: delivery.id,
            orderId: validatedData.orderId,
            deliveryAgentId,
            userId: order.userId,
            shopId: order.shopId,
        });
        utils_1.logger.info(`Delivery assigned: ${delivery.id} for order ${validatedData.orderId}`);
        res.status(201).json({
            success: true,
            data: delivery,
        });
    }
    catch (error) {
        utils_1.logger.error("Assign delivery error", error);
        throw error;
    }
};
exports.assignDelivery = assignDelivery;
// Find nearest available delivery agent
async function findNearestAvailableAgent(shopLat, shopLng) {
    try {
        // Get all active delivery agents
        const agents = await database_1.prisma.deliveryAgent.findMany({
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
        const availableAgents = agents.filter(agent => agent.deliveries.length < 3);
        if (availableAgents.length === 0) {
            return null;
        }
        // Find the nearest agent
        let nearestAgent = null;
        let minDistance = Infinity;
        for (const agent of availableAgents) {
            if (agent.currentLatitude && agent.currentLongitude) {
                const distance = calculateDistance(shopLat, shopLng, agent.currentLatitude, agent.currentLongitude);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestAgent = agent;
                }
            }
        }
        return nearestAgent ? nearestAgent.id : availableAgents[0].id; // Fallback to first available
    }
    catch (error) {
        utils_1.logger.error("Find nearest agent error", error);
        return null;
    }
}
// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}
// Get all deliveries (admin)
const getAllDeliveries = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    try {
        const where = {};
        if (status)
            where.status = status;
        const deliveries = await database_1.prisma.delivery.findMany({
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
        const total = await database_1.prisma.delivery.count({ where });
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
    }
    catch (error) {
        utils_1.logger.error("Get all deliveries error", error);
        throw error;
    }
};
exports.getAllDeliveries = getAllDeliveries;
// Get delivery agents (admin)
const getDeliveryAgents = async (req, res) => {
    try {
        const agents = await database_1.prisma.deliveryAgent.findMany({
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
        const agentsWithStats = agents.map(agent => ({
            ...agent,
            activeDeliveries: agent.deliveries.length,
            isAvailable: agent.deliveries.length < 3 && agent.isActive,
        }));
        res.json({
            success: true,
            data: agentsWithStats,
        });
    }
    catch (error) {
        utils_1.logger.error("Get delivery agents error", error);
        throw error;
    }
};
exports.getDeliveryAgents = getDeliveryAgents;
// Get assigned deliveries (delivery agent)
const getAssignedDeliveries = async (req, res) => {
    const userId = req.user.userId;
    try {
        const deliveryAgent = await database_1.prisma.deliveryAgent.findUnique({
            where: { userId },
        });
        if (!deliveryAgent) {
            throw new middleware_1.AppError("Delivery agent not found", 404);
        }
        const deliveries = await database_1.prisma.delivery.findMany({
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
    }
    catch (error) {
        utils_1.logger.error("Get assigned deliveries error", error);
        throw error;
    }
};
exports.getAssignedDeliveries = getAssignedDeliveries;
// Update delivery status (delivery agent)
const updateDeliveryStatus = async (req, res) => {
    const { id } = req.params;
    const validatedData = updateDeliveryStatusSchema.parse(req.body);
    const userId = req.user.userId;
    try {
        const deliveryAgent = await database_1.prisma.deliveryAgent.findUnique({
            where: { userId },
        });
        if (!deliveryAgent) {
            throw new middleware_1.AppError("Delivery agent not found", 404);
        }
        const delivery = await database_1.prisma.delivery.findFirst({
            where: {
                id,
                deliveryAgentId: deliveryAgent.id,
            },
            include: {
                order: true,
            },
        });
        if (!delivery) {
            throw new middleware_1.AppError("Delivery not found", 404);
        }
        // Update delivery status
        const updatedDelivery = await database_1.prisma.delivery.update({
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
            await database_1.prisma.order.update({
                where: { id: delivery.orderId },
                data: {
                    status: types_1.OrderStatus.DELIVERED,
                    deliveredAt: new Date(),
                },
            });
            // Create notification for customer
            await database_1.prisma.notification.create({
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
        await (0, rabbitmq_1.publishToQueue)("delivery.status_updated", {
            deliveryId: id,
            orderId: delivery.orderId,
            status: validatedData.status,
            userId: delivery.order.userId,
            shopId: delivery.order.shopId,
        });
        utils_1.logger.info(`Delivery status updated: ${id} to ${validatedData.status}`);
        res.json({
            success: true,
            data: updatedDelivery,
        });
    }
    catch (error) {
        utils_1.logger.error("Update delivery status error", error);
        throw error;
    }
};
exports.updateDeliveryStatus = updateDeliveryStatus;
// Update delivery location (delivery agent)
const updateDeliveryLocation = async (req, res) => {
    const { id } = req.params;
    const validatedData = updateLocationSchema.parse(req.body);
    const userId = req.user.userId;
    try {
        const deliveryAgent = await database_1.prisma.deliveryAgent.findUnique({
            where: { userId },
        });
        if (!deliveryAgent) {
            throw new middleware_1.AppError("Delivery agent not found", 404);
        }
        const delivery = await database_1.prisma.delivery.findFirst({
            where: {
                id,
                deliveryAgentId: deliveryAgent.id,
            },
        });
        if (!delivery) {
            throw new middleware_1.AppError("Delivery not found", 404);
        }
        // Update delivery location
        const updatedDelivery = await database_1.prisma.delivery.update({
            where: { id },
            data: {
                currentLatitude: validatedData.latitude,
                currentLongitude: validatedData.longitude,
            },
        });
        // Update agent location
        await database_1.prisma.deliveryAgent.update({
            where: { id: deliveryAgent.id },
            data: {
                currentLatitude: validatedData.latitude,
                currentLongitude: validatedData.longitude,
            },
        });
        // Publish location update event
        await (0, rabbitmq_1.publishToQueue)("delivery.location_updated", {
            deliveryId: id,
            orderId: delivery.orderId,
            latitude: validatedData.latitude,
            longitude: validatedData.longitude,
        });
        res.json({
            success: true,
            data: updatedDelivery,
        });
    }
    catch (error) {
        utils_1.logger.error("Update delivery location error", error);
        throw error;
    }
};
exports.updateDeliveryLocation = updateDeliveryLocation;
// Get pending deliveries for vendor
const getPendingDeliveriesForVendor = async (req, res) => {
    const userId = req.user.userId;
    try {
        const vendor = await database_1.prisma.vendor.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new middleware_1.AppError("Vendor not found", 404);
        }
        // Get shops for this vendor
        const shops = await database_1.prisma.shop.findMany({
            where: { vendorId: vendor.id },
            select: { id: true },
        });
        const shopIds = shops.map(shop => shop.id);
        const deliveries = await database_1.prisma.delivery.findMany({
            where: {
                order: {
                    shopId: { in: shopIds },
                    status: types_1.OrderStatus.READY,
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
    }
    catch (error) {
        utils_1.logger.error("Get pending deliveries for vendor error", error);
        throw error;
    }
};
exports.getPendingDeliveriesForVendor = getPendingDeliveriesForVendor;
//# sourceMappingURL=deliveryController.js.map