// ============================================
// Shared Types & Interfaces
// ============================================

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  ADMIN = "ADMIN",
  DELIVERY_AGENT = "DELIVERY_AGENT",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  INITIATED = "INITIATED",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  UPI = "UPI",
  WALLET = "WALLET",
  COD = "COD",
}

export enum DeliveryType {
  HOME_DELIVERY = "HOME_DELIVERY",
  STORE_PICKUP = "STORE_PICKUP",
}

export enum ProductCategory {
  GROCERY = "GROCERY",
  MEDICAL = "MEDICAL",
  ELECTRICAL = "ELECTRICAL",
  SWEETS = "SWEETS",
  STATIONARY = "STATIONARY",
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  status: number;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RabbitMQMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: string;
}
