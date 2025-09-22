import { sendError, sendSuccess } from "../../utils/response.ts";
import { Request, Response } from "express";
import {
  getUserByID,
  updateUser,
  updateUserInitialData,
} from "./user.service.ts";
import { generateToken } from "../../utils/jwt.ts";
import { getBookingsAndRecommendations } from "../../services/dashboard.ts";

export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    const updatedUser = await updateUser({
      userId: updateData.userId,
      ...updateData,
    });
    if (!updatedUser) {
      sendError(res, 404, "User not found");
      return;
    }

    sendSuccess(res, null, "User updated successfully");
  } catch (error) {
    console.error("Error updating user:", error);
    sendError(res, 500, "Internal server error");
  }
};

export const UpdateInitialData = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    console.log("data", updateData);
    const updatedUser = await updateUserInitialData(updateData);
    if (!updatedUser) {
      sendError(res, 404, "User not found");
      return;
    }

    sendSuccess(
      res,
      { name: updateData.name, mobile: updateData.mobile, status: "active" },
      "User updated successfully"
    );
  } catch (error) {
    console.error("Error updating initial data:", error);
    sendError(res, 500, "Internal server error");
  }
};

export const getUserHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const user = await getUserByID(userId);
    if (!user) {
      sendError(res, 404, "User not found");
      return;
    }

    sendSuccess(res, user, "User retrieved successfully");
  } catch (error) {
    console.error("Error retrieving user:", error);
    sendError(res, 500, "Internal server error");
  }
};

export const dashboardHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log("userId", userId);
    if (!userId) {
      sendError(res, 401, "Unauthorized");
      return;
    }
    const dashboardData = await getBookingsAndRecommendations(userId, 3);
    sendSuccess(res, dashboardData, "Dashboard data retrieved successfully");
  } catch (error) {
    sendError(res, 500, "Internal server error");
  }
};
