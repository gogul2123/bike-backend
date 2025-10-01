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
import { authorizeRoles } from "../../middlewares/authorizeRole.ts";

const router = Router();

// Bike CRUD routes
router.post(
  "/createBike",
  authorizeRoles(),
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

router.get(
  "/getById/:bikeId",
  authorizeRoles(),
  validateZod(bikeIdSchema),
  getBikeByIdHandler
);

router.post(
  "/getAllBikes",
  authorizeRoles(),
  validateZod(AvailabilityQueryInput.partial()),
  getBikesHandler
);

router.delete(
  "/deleteBike/:bikeId",
  authorizeRoles(),
  validateZod(bikeIdSchema),
  deleteBikeHandler
);

router.put(
  "/updateBike/:bikeId",
  authorizeRoles(),
  optionalFileUpload("imageFile"),
  validateZod(UpdateBikeInput),
  preprocessBikeFields,
  updateBikeHandler
);

// Vehicle management routes
router.post(
  "/addVehicle/:bikeId/vehicles",
  authorizeRoles(),
  validateZod(AddVehicleInput),
  addVehicleHandler
);

router.post(
  "/updateVehicleStatus/:bikeId/updateVehicle",
  authorizeRoles(),
  validateZod(UpdateVehicleStatusInput),
  updateVehicleStatusHandler
);

router.delete(
  "/:bikeId/vehicles/:vehicleNumber",
  authorizeRoles(),
  validateZod(vehicleNumberSchema),
  removeVehicleHandler
);

// Availability routes
router.post(
  "/availableBikes",
  validateZod(AvailabilityQueryInput),
  checkAvailabilityHandler
);

// Vehicle status routes
router.get(
  "/:bikeId/vehicles",
  authorizeRoles(),
  validateZod(statusQuerySchema),
  getVehiclesByStatusHandler
);

export default router;
