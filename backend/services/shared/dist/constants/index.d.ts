export declare const SERVICES: {
    AUTH: string;
    USER: string;
    SHOP: string;
    PRODUCT: string;
    ORDER: string;
    PAYMENT: string;
    DELIVERY: string;
    NOTIFICATION: string;
    AI_RECOMMENDATION: string;
};
export declare const QUEUE_NAMES: {
    ORDER_CREATED: string;
    ORDER_CONFIRMED: string;
    ORDER_READY: string;
    ORDER_PICKED: string;
    PAYMENT_SUCCESS: string;
    PAYMENT_FAILED: string;
    DELIVERY_ASSIGNED: string;
    DELIVERY_UPDATED: string;
    USER_REGISTERED: string;
    VENDOR_APPROVED: string;
    NOTIFICATION_SEND: string;
};
export declare const SOCKET_EVENTS: {
    ORDER_PLACED: string;
    ORDER_ACCEPTED: string;
    ORDER_REJECTED: string;
    ORDER_STATUS_UPDATED: string;
    DELIVERY_ASSIGNED: string;
    DELIVERY_LOCATION_UPDATED: string;
    NOTIFICATION_RECEIVED: string;
    VENDOR_REQUEST: string;
};
export declare const CACHE_KEYS: {
    USER: (id: string) => string;
    SHOP: (id: string) => string;
    PRODUCT: (id: string) => string;
    TRENDING_PRODUCTS: (area: string) => string;
    RECOMMENDATIONS: (userId: string) => string;
    POPULAR_SHOPS: (area: string) => string;
    ORDER: (id: string) => string;
};
export declare const CACHE_TTL: {
    USER: number;
    SHOP: number;
    PRODUCT: number;
    RECOMMENDATIONS: number;
    TRENDING_PRODUCTS: number;
    POPULAR_SHOPS: number;
    ORDER: number;
};
export declare const DELIVERY_RADIUS_KM = 5;
export declare const COMMISSION_PERCENTAGE = 10;
export declare const DEFAULT_PAGE_LIMIT = 10;
export declare const MAX_PAGE_LIMIT = 100;
export declare const IMAGE_STORAGE: {
    BUCKET_PRODUCTS: string;
    BUCKET_SHOPS: string;
    BUCKET_USERS: string;
};
export declare const ERROR_CODES: {
    INVALID_CREDENTIALS: string;
    USER_NOT_FOUND: string;
    UNAUTHORIZED: string;
    FORBIDDEN: string;
    INVALID_INPUT: string;
    ALREADY_EXISTS: string;
    NOT_FOUND: string;
    INTERNAL_ERROR: string;
    PAYMENT_FAILED: string;
    SERVICE_UNAVAILABLE: string;
};
export declare const RAZORPAY_SETTINGS: {
    PAYMENT_METHOD: string;
    CURRENCY: string;
    RECEIPT_PREFIX: string;
};
export declare const PAGINATION_DEFAULTS: {
    DEFAULT_PAGE: number;
    DEFAULT_LIMIT: number;
    MAX_LIMIT: number;
};
//# sourceMappingURL=index.d.ts.map