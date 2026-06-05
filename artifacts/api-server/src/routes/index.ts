import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import bookingsRouter from "./bookings";
import dashboardRouter from "./dashboard";
import servicesRouter from "./services";
import artistProfileRouter from "./artist-profile";
import contractTemplatesRouter from "./contract-templates";
import tagsRouter from "./tags";
import notificationsRouter from "./notifications";
import portalRouter from "./portal";
import emailRouter from "./email";
import automationsRouter from "./automations";
import paymentIntentsRouter from "./payment-intents";
import calendarRouter from "./calendar";
import leadsRouter from "./leads";
import expensesRouter from "./expenses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(servicesRouter);
router.use(artistProfileRouter);
router.use(contractTemplatesRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);
router.use(tagsRouter);
router.use(notificationsRouter);
router.use(portalRouter);
router.use(emailRouter);
router.use(automationsRouter);
router.use(paymentIntentsRouter);
router.use(calendarRouter);
router.use(leadsRouter);
router.use(expensesRouter);

export default router;
