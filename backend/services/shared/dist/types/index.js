"use strict";
// ============================================
// Shared Types & Interfaces
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCategory = exports.DeliveryType = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["VENDOR"] = "VENDOR";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["DELIVERY_AGENT"] = "DELIVERY_AGENT";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["INITIATED"] = "INITIATED";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
    PaymentMethod["DEBIT_CARD"] = "DEBIT_CARD";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["WALLET"] = "WALLET";
    PaymentMethod["COD"] = "COD";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var DeliveryType;
(function (DeliveryType) {
    DeliveryType["HOME_DELIVERY"] = "HOME_DELIVERY";
    DeliveryType["STORE_PICKUP"] = "STORE_PICKUP";
})(DeliveryType || (exports.DeliveryType = DeliveryType = {}));
var ProductCategory;
(function (ProductCategory) {
    ProductCategory["GROCERY"] = "GROCERY";
    ProductCategory["MEDICAL"] = "MEDICAL";
    ProductCategory["ELECTRICAL"] = "ELECTRICAL";
    ProductCategory["SWEETS"] = "SWEETS";
    ProductCategory["STATIONARY"] = "STATIONARY";
})(ProductCategory || (exports.ProductCategory = ProductCategory = {}));
//# sourceMappingURL=index.js.map