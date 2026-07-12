import { Router, type IRouter } from "express";
import publicPortalRouter from "./public-portal";
import publicLeadsRouter from "./public-leads";
import publicCalendarRouter from "./public-calendar";
import publicAddonsRouter from "./public-addons";

const router: IRouter = Router();

router.use(publicPortalRouter);
router.use(publicLeadsRouter);
router.use(publicCalendarRouter);
router.use(publicAddonsRouter);

export default router;
