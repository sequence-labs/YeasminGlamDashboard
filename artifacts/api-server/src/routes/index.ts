import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import bookingsRouter from "./bookings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);

export default router;
