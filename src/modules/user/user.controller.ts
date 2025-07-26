import { sendError, sendSuccess } from "../../utils/response.ts";
import { Request, Response } from "express";
import { updateUserStatus } from "./user.service.ts";

export const updateUserHanlder = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    const updatedUser = await updateUserStatus({
      userId: updateData.userId,
      ...updateData,
    });
    if (!updatedUser) {
      sendError(res, 404, "User not found");
      return;
    }
    sendSuccess(res, updatedUser, "User updated successfully");
  } catch (error) {
    console.error("Error updating user:", error);
    sendError(res, 500, "Internal server error");
  }
};
