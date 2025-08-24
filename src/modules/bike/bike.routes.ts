import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import {
  bikeIdSchema,
  createBikeSchemaWithFile,
  GetBikesInput,
  updateBikeSchemaWithFile,
} from "./bike.model.ts";
import { optionalFileUpload, upload } from "../../middlewares/multer.ts";
import { validateZod } from "../../middlewares/validate.ts";
import {
  createBikeHandler,
  deleteBikeHandler,
  getBikeByIdHandler,
  getBikesHandler,
  updateBikeHandler,
} from "./bike.controller.ts";
import { preprocessBikeFields } from "../../pre_processors/preprocessBikeFields.ts";

const router = Router();

router.post(
  "/create-bike",
  upload.single("imageFile"),
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }
    next();
  },
  preprocessBikeFields,
  validateZod(createBikeSchemaWithFile),
  createBikeHandler
);

router.post("/get-bike", validateZod(bikeIdSchema), getBikeByIdHandler);
router.post("/get-bikes", validateZod(GetBikesInput), getBikesHandler);
router.delete("/delete-bike", validateZod(bikeIdSchema), deleteBikeHandler);
router.post(
  "/update-bike",
  optionalFileUpload("imageFile"),
  validateZod(updateBikeSchemaWithFile),
  preprocessBikeFields,
  updateBikeHandler
);

export default router;
