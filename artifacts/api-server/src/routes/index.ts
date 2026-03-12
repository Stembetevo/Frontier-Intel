import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import killsRouter from "./kills.js";
import assembliesRouter from "./assemblies.js";
import jumpsRouter from "./jumps.js";
import intelRouter from "./intel.js";
import systemsRouter from "./systems.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(killsRouter);
router.use(assembliesRouter);
router.use(jumpsRouter);
router.use(intelRouter);
router.use(systemsRouter);

export default router;
