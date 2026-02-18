"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.connectDB = void 0;
const client_1 = require("@prisma/client");
const utils_1 = require("../../../shared/src/utils");
const prisma = new client_1.PrismaClient({
    log: ["query", "error", "warn"],
});
exports.prisma = prisma;
const connectDB = async () => {
    try {
        await prisma.$connect();
        utils_1.logger.info("Connected to PostgreSQL database");
    }
    catch (error) {
        utils_1.logger.error("Failed to connect to database", error);
        throw error;
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=database.js.map