import { sendError, sendSuccess } from "../../utils/response.ts";
import {
  createBikeService,
  deleteBikeService,
  getBikeById,
  getBikesService,
  updateBikeService,
} from "./bike.service.ts";
import { Request, Response } from "express";

export const createBikeHandler = async (req: Request, res: Response) => {
  try {
    const created = await createBikeService({
      ...req.body,
      imageFile: req.file?.buffer,
    });
    sendSuccess(res, created);
  } catch (err) {
    console.error("Error creating bike:", err);
    sendError(res, 500, (err as Error).message || "Failed to create bike");
  }
};

export const getBikesHandler = async (req: Request, res: Response) => {
  try {
    const bikes = await getBikesService(req.body);
    if (!bikes) {
      sendError(res, 404, "Bikes not found");
      return;
    }
    sendSuccess(res, bikes);
  } catch (error) {
    sendError(res, 500, (error as Error).message || "Failed to fetch bikes");
  }
};

export const getBikeByIdHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId: id } = req.body;
    const bike = await getBikeById(id);
    if (!bike) {
      sendError(res, 404, "Bike not found");
      return;
    }
    sendSuccess(res, bike);
  } catch (err) {
    console.error("Error fetching bike by ID:", err);
    sendError(res, 500, (err as Error).message || "Failed to fetch bike");
  }
};

export const deleteBikeHandler = async (req: Request, res: Response) => {
  try {
    const { bikeId: id } = req.body;
    const bike = await getBikeById(id);
    if (!bike) {
      sendError(res, 404, "Bike not found");
      return;
    }
    const result = await deleteBikeService(id);
    if (result) {
      sendSuccess(res, result);
      return;
    } else {
      sendError(res, 500, "Failed to delete bike");
    }
  } catch (err) {
    sendError(res, 500, (err as Error).message || "Failed to delete bike");
  }
};

export const updateBikeHandler = async (req: Request, res: Response) => {
  try {
    const updated = await updateBikeService(req.body);
    if (!updated) {
      sendError(res, 404, "Bike not found");
      return;
    }
    sendSuccess(res, "bike updated successfully");
  } catch (err) {
    console.error("Error updating bike:", err);
    sendError(res, 500, (err as Error).message || "Failed to update bike");
  }
};
