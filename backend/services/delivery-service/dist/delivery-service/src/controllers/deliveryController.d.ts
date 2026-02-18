import { Request, Response } from "express";
export declare const assignDelivery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllDeliveries: (req: Request, res: Response) => Promise<void>;
export declare const getDeliveryAgents: (req: Request, res: Response) => Promise<void>;
export declare const getAssignedDeliveries: (req: Request, res: Response) => Promise<void>;
export declare const updateDeliveryStatus: (req: Request, res: Response) => Promise<void>;
export declare const updateDeliveryLocation: (req: Request, res: Response) => Promise<void>;
export declare const getPendingDeliveriesForVendor: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=deliveryController.d.ts.map