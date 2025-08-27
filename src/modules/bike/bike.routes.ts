import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import {
  CreateBikeInput,
  UpdateBikeInput,
  AddVehicleInput,
  UpdateVehicleStatusInput,
  RemoveVehicleInput,
  AvailabilityQueryInput,
  bikeIdSchema,
  vehicleNumberSchema,
  statusQuerySchema,
} from "./bike.model.ts";
import { optionalFileUpload, upload } from "../../middlewares/multer.ts";
import { validateZod } from "../../middlewares/validate.ts";
import {
  createBikeHandler,
  deleteBikeHandler,
  getBikeByIdHandler,
  getBikesHandler,
  updateBikeHandler,
  addVehicleHandler,
  updateVehicleStatusHandler,
  removeVehicleHandler,
  checkAvailabilityHandler,
  getVehiclesByStatusHandler,
} from "./bike.controller.ts";
import { preprocessBikeFields } from "../../pre_processors/preprocessBikeFields.ts";

const router = Router();

// Bike CRUD routes
router.post(
  "/createBike",
  upload.single("imageFile"),
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }
    next();
  },
  preprocessBikeFields,
  validateZod(CreateBikeInput),
  createBikeHandler
);

router.get("/getById/:bikeId", validateZod(bikeIdSchema), getBikeByIdHandler);
router.get(
  "/gateAllBikes",
  validateZod(AvailabilityQueryInput.partial()),
  getBikesHandler
);
router.delete(
  "/deleteBike/:bikeId",
  validateZod(bikeIdSchema),
  deleteBikeHandler
);

router.put(
  "/updateBike/:bikeId",
  optionalFileUpload("imageFile"),
  validateZod(UpdateBikeInput),
  preprocessBikeFields,
  updateBikeHandler
);

// Vehicle management routes
router.post(
  "/addVehicle/:bikeId/vehicles",
  validateZod(AddVehicleInput),
  addVehicleHandler
);

router.patch(
  "/updateVehicleStatus/:bikeId/vehicles/status",
  validateZod(UpdateVehicleStatusInput),
  updateVehicleStatusHandler
);

router.delete(
  "/:bikeId/vehicles/:vehicleNumber",
  validateZod(vehicleNumberSchema),
  removeVehicleHandler
);

// Availability routes
router.get(
  "/:bikeId/availability/check",
  validateZod(AvailabilityQueryInput),
  checkAvailabilityHandler
);

// Vehicle status routes
router.get(
  "/:bikeId/vehicles",
  validateZod(statusQuerySchema),
  getVehiclesByStatusHandler
);

export default router;
