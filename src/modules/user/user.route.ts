import { Router } from "express";
import { updateInitialDataSchemaZ, updateUserSchemaZ } from "./user.model.ts";
import { UpdateInitialData, updateUserHanlder } from "./user.controller.ts";
import { validateZod } from "../../middlewares/validate.ts";

const router = Router();

router.post("/update-user", validateZod(updateUserSchemaZ), updateUserHanlder);

router.post(
  "/update-initial-data",
  validateZod(updateInitialDataSchemaZ),
  UpdateInitialData
);

export default router;
