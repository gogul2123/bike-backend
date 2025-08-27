import { Request, Response } from "express";
import {
  createBikeService,
  getBikeById,
  getBikesService,
  updateBikeService,
  deleteBikeService,
  addVehicleService,
  updateVehicleStatusService,
  removeVehicleService,
  checkAvailabilityService,
  getVehiclesByStatusService,
} from "./bike.service.ts";
import { sendSuccess, sendError } from "../../utils/response.ts";

export const createBikeHandler = async (req: Request, res: Response) => {
  try {
    const result = await createBikeService({
      ...req.body,
      imageFile: req.file?.buffer,
    });
    sendSuccess(res, result, "Bike created successfully");
  } catch (err: any) {
    console.error("Error creating bike:", err);
    sendError(res, err.statusCode || 500, err.message);
  }
};

export const getBikeByIdHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId } = req.params;
    const bike = await getBikeById(bikeId);

    if (!bike) {
      sendError(res, 404, "Bike not found");
      return;
    }

    sendSuccess(res, bike, "Bike retrieved successfully");
  } catch (err: any) {
    console.error("Error getting bike:", err);
    sendError(res, 500, err.message);
  }
};

export const getBikesHandler = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      category,
      transmission,
      type,
      brand,
      model,
      minPrice,
      maxPrice,
      location,
      isActive,
    } = req.query;

    const filters = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      category: category as string,
      transmission: transmission as "gear" | "automatic",
      type: type as string,
      brand: brand as string,
      model: model as string,
      minPrice: minPrice ? parseInt(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      location: location as string,
      isActive: isActive ? isActive === "true" : undefined,
    };

    const result = await getBikesService(filters);
    sendSuccess(res, result, "Bikes retrieved successfully");
  } catch (err: any) {
    console.error("Error getting bikes:", err);
    sendError(res, 500, err.message);
  }
};

export const updateBikeHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId } = req.params;
    const result = await updateBikeService({
      ...req.body,
      bikeId,
      imageFile: req.file?.buffer,
    });
    sendSuccess(res, result, "Bike updated successfully");
  } catch (err: any) {
    console.error("Error updating bike:", err);
    sendError(res, err.statusCode || 500, err.message);
  }
};

export const deleteBikeHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId } = req.params;
    const result = await deleteBikeService(bikeId);

    if (!result) {
      sendError(res, 404, "Bike not found");
      return;
    }

    sendSuccess(res, null, "Bike deleted successfully");
  } catch (err: any) {
    console.error("Error deleting bike:", err);
    sendError(res, 500, err.message);
  }
};

export const addVehicleHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId } = req.params;
    const result = await addVehicleService({
      ...req.body,
      bikeId,
    });
    sendSuccess(res, result, "Vehicle added successfully");
  } catch (err: any) {
    console.error("Error adding vehicle:", err);
    sendError(res, err.statusCode || 500, err.message);
  }
};

export const updateVehicleStatusHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { bikeId } = req.params;
    const result = await updateVehicleStatusService({
      ...req.body,
      bikeId,
    });
    sendSuccess(res, result, "Vehicle status updated successfully");
  } catch (err: any) {
    console.error("Error updating vehicle status:", err);
    sendError(res, err.statusCode || 500, err.message);
  }
};

export const removeVehicleHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId, vehicleNumber } = req.params;
    const result = await removeVehicleService({
      bikeId,
      vehicleNumber,
    });
    sendSuccess(res, result, "Vehicle removed successfully");
  } catch (err: any) {
    console.error("Error removing vehicle:", err);
    sendError(res, err.statusCode || 500, err.message);
  }
};

export const checkAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const {
      fromDate,
      toDate,
      category,
      minPrice,
      maxPrice,
      location,
      transmission,
      brand,
      minVehicles = "1",
    } = req.query;

    const query = {
      fromDate: fromDate ? new Date(fromDate as string) : new Date(),
      toDate: toDate ? new Date(toDate as string) : new Date(),
      category: category as string,
      minPrice: minPrice ? parseInt(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      location: location as string,
      transmission: transmission as "gear" | "automatic",
      brand: brand as string,
      minVehicles: parseInt(minVehicles as string),
    };

    const result = await checkAvailabilityService(query);
    sendSuccess(res, result, "Availability checked successfully");
  } catch (err: any) {
    console.error("Error checking availability:", err);
    sendError(res, 500, err.message);
  }
};

export const getVehiclesByStatusHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { bikeId } = req.params;
    const { status } = req.query;

    const result = await getVehiclesByStatusService(
      bikeId,
      status as "AVAILABLE" | "RENTED" | "MAINTENANCE" | "INACTIVE"
    );
    sendSuccess(res, result, "Vehicles retrieved successfully");
  } catch (err: any) {
    console.error("Error getting vehicles by status:", err);
    sendError(res, 500, err.message);
  }
};
