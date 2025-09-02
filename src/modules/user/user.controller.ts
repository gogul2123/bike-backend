import { sendError, sendSuccess } from "../../utils/response.ts";
import { Request, Response } from "express";
import {
  getUserByID,
  updateUser,
  updateUserInitialData,
} from "./user.service.ts";
import { generateToken } from "../../utils/jwt.ts";

export const updateUserHanlder = async (req: Request, res: Response) => {
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
