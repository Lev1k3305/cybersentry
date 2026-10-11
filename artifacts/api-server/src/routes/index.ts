import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commandRouter from "./command";
import cybersentryRouter from "./cybersentry";
import { createRateLimiter } from "../middlewares/rateLimiter";

const router: IRouter = Router();

// Apply rate limiter to sensitive API endpoints to protect against DoS / brute-force scans
const apiLimiter = createRateLimiter({
  windowMs: 60_000, // 1 minute window
  max: 60, // Max 60 requests per minute
});

router.use(healthRouter);
router.use(apiLimiter, commandRouter);
router.use(apiLimiter, cybersentryRouter);

export default router;
