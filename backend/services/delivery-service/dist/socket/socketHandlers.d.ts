import { Server } from "socket.io";
export declare const setupSocketHandlers: (io: Server) => void;
export declare const emitToUser: (userId: string, event: string, data: any) => void;
export declare const emitToDelivery: (deliveryId: string, event: string, data: any) => void;
export declare const emitToRole: (role: string, event: string, data: any) => void;
export declare const setIO: (io: Server) => void;
export declare const getIO: () => Server;
//# sourceMappingURL=socketHandlers.d.ts.map