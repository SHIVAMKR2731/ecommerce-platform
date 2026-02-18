// src/index.ts
import express, { Express, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});
app.use("/api/", limiter);

// Routes
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", service: "shop-service" });
});

app.get("/api/shops", (req: Request, res: Response) => {
  res.json({ message: "Shop service - coming soon" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Shop Service listening on port ${PORT}`);
});