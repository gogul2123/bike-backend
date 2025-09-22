import { Router } from "express";
import {
  updateInitialDataSchemaZ,
  updateUserSchemaZ,
  getUser,
} from "./user.model.ts";
import {
  UpdateInitialData,
  updateUserHandler,
  getUserHandler,
  dashboardHandler,
} from "./user.controller.ts";
import { validateZod } from "../../middlewares/validate.ts";

const router = Router();

router.post("/update-user", validateZod(updateUserSchemaZ), updateUserHandler);

router.post(
  "/update-initial-data",
  validateZod(updateInitialDataSchemaZ),
  UpdateInitialData
);

router.post("/get-user", validateZod(getUser), getUserHandler);

router.get("/dashboard/:userId", dashboardHandler);

export default router;
