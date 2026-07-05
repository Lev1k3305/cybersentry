import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commandRouter from "./command";

const router: IRouter = Router();

router.use(healthRouter);
router.use(commandRouter);

export default router;
