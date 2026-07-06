import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commandRouter from "./command";
import cybersentryRouter from "./cybersentry";

const router: IRouter = Router();

router.use(healthRouter);
router.use(commandRouter);
router.use(cybersentryRouter);

export default router;
