import { Router } from "express";
import { updateUserSchemaZ } from "./user.model.ts";
import { updateUserHanlder } from "./user.controller.ts";
import { validateZod } from "../../middlewares/validate.ts";

const router = Router();

router.post("/update-user", validateZod(updateUserSchemaZ), updateUserHanlder);

export default router;
