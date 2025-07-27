import { sendError, sendSuccess } from "../../utils/response.ts";
import { getCollection } from "../db/database.ts";
import { Bike } from "./bike.model.ts";
import { createBikeService, getBikeById } from "./bike.service.ts";
import { Request, Response } from "express";

export const createBikeHandler = async (req: Request, res: Response) => {
  try {
    const created = await createBikeService(req.body);
    sendSuccess(res, created);
  } catch (err) {
    console.error("Error creating bike:", err);
    sendError(res, 500, (err as Error).message || "Failed to create bike");
  }
};

export const getBikeByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
