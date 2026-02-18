"use strict";
// ============================================
// Shared Constants
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION_DEFAULTS = exports.RAZORPAY_SETTINGS = exports.ERROR_CODES = exports.IMAGE_STORAGE = exports.MAX_PAGE_LIMIT = exports.DEFAULT_PAGE_LIMIT = exports.COMMISSION_PERCENTAGE = exports.DELIVERY_RADIUS_KM = exports.CACHE_TTL = exports.CACHE_KEYS = exports.SOCKET_EVENTS = exports.QUEUE_NAMES = exports.SERVICES = void 0;
exports.SERVICES = {
    AUTH: "http://auth-service:3001",
    USER: "http://user-service:3002",
    SHOP: "http://shop-service:3003",
    PRODUCT: "http://product-service:3004",
    ORDER: "http://order-service:3005",
    PAYMENT: "http://payment-service:3006",
    DELIVERY: "http://delivery-service:3007",
    NOTIFICATION: "http://notification-service:3008",
    AI_RECOMMENDATION: "http://ai-service:5000",
};
exports.QUEUE_NAMES = {
    ORDER_CREATED: "order.created",
    ORDER_CONFIRMED: "order.confirmed",
    ORDER_READY: "order.ready",
    ORDER_PICKED: "order.picked",
    PAYMENT_SUCCESS: "payment.success",
    PAYMENT_FAILED: "payment.failed",
    DELIVERY_ASSIGNED: "delivery.assigned",
    DELIVERY_UPDATED: "delivery.updated",
    USER_REGISTERED: "user.registered",
    VENDOR_APPROVED: "vendor.approved",
    NOTIFICATION_SEND: "notification.send",
};
exports.SOCKET_EVENTS = {
    ORDER_PLACED: "order:placed",
    ORDER_ACCEPTED: "order:accepted",
    ORDER_REJECTED: "order:rejected",
    ORDER_STATUS_UPDATED: "order:statusUpdated",
    DELIVERY_ASSIGNED: "delivery:assigned",
    DELIVERY_LOCATION_UPDATED: "delivery:locationUpdated",
    NOTIFICATION_RECEIVED: "notification:received",
    VENDOR_REQUEST: "vendor:request",
};
exports.CACHE_KEYS = {
    USER: (id) => `user:${id}`,
    SHOP: (id) => `shop:${id}`,
    PRODUCT: (id) => `product:${id}`,
    TRENDING_PRODUCTS: (area) => `trending:products:${area}`,
    RECOMMENDATIONS: (userId) => `recommendations:${userId}`,
    POPULAR_SHOPS: (area) => `popular:shops:${area}`,
    ORDER: (id) => `order:${id}`,
};
exports.CACHE_TTL = {
    USER: 3600, // 1 hour
    SHOP: 1800, // 30 minutes
    PRODUCT: 1800, // 30 minutes
    RECOMMENDATIONS: 86400, // 24 hours
    TRENDING_PRODUCTS: 3600, // 1 hour
    POPULAR_SHOPS: 3600, // 1 hour
    ORDER: 300, // 5 minutes
};
exports.DELIVERY_RADIUS_KM = 5;
exports.COMMISSION_PERCENTAGE = 10;
exports.DEFAULT_PAGE_LIMIT = 10;
exports.MAX_PAGE_LIMIT = 100;
exports.IMAGE_STORAGE = {
    BUCKET_PRODUCTS: "bazaarlink-products",
    BUCKET_SHOPS: "bazaarlink-shops",
    BUCKET_USERS: "bazaarlink-users",
};
exports.ERROR_CODES = {
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    INVALID_INPUT: "INVALID_INPUT",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    NOT_FOUND: "NOT_FOUND",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    PAYMENT_FAILED: "PAYMENT_FAILED",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
};
exports.RAZORPAY_SETTINGS = {
    PAYMENT_METHOD: "razorpay",
    CURRENCY: "INR",
    RECEIPT_PREFIX: "BL",
};
exports.PAGINATION_DEFAULTS = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
};
//# sourceMappingURL=index.js.map