import { Router } from "express";
import { getAdminDashboard } from "./dashboard.controller.ts";

const router = Router();

router.get("/adminDashboard", getAdminDashboard);

export default router;
