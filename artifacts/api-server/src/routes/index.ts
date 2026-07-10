import { Router, type IRouter } from "express";
import healthRouter from "./health";
import providersRouter from "./providers";
import appointmentsRouter from "./appointments";
import revenueRouter from "./revenue";
import institutesRouter from "./institutes";
import bannersRouter from "./banners";
import reviewsRouter from "./reviews";
import patientsRouter from "./patients";
import auditRouter from "./audit";
import teleradiologyRouter from "./teleradiology";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(providersRouter);
router.use(appointmentsRouter);
router.use(revenueRouter);
router.use(institutesRouter);
router.use(bannersRouter);
router.use(reviewsRouter);
router.use(patientsRouter);
router.use(auditRouter);
router.use(teleradiologyRouter);
router.use(settingsRouter);

export default router;
