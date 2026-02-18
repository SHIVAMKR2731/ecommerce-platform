import { PrismaClient } from "@prisma/client";
import { logger } from "../../../shared/src/utils";

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("Connected to PostgreSQL database");
  } catch (error) {
    logger.error("Failed to connect to database", error);
    throw error;
  }
};

export { prisma };