import { Router } from "express";
import {
  updateInitialDataSchemaZ,
  updateUserSchemaZ,
  getUser,
  getAllUser,
  searchUUsers,
} from "./user.model.ts";
import {
  UpdateInitialData,
  updateUserHandler,
  getUserHandler,
  getAllUsersHandler,
  dashboardHandler,
  searchUsersHandler,
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

router.post("/get-all-users", validateZod(getAllUser), getAllUsersHandler);

router.post("/search-users", validateZod(searchUUsers), searchUsersHandler);

router.get("/dashboard/:userId", dashboardHandler);

export default router;
