import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import bookingsRouter from "./bookings";
import dashboardRouter from "./dashboard";
import servicesRouter from "./services";
import artistProfileRouter from "./artist-profile";
import contractTemplatesRouter from "./contract-templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(servicesRouter);
router.use(artistProfileRouter);
router.use(contractTemplatesRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);

export default router;
