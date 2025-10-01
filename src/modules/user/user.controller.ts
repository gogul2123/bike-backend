import { sendError, sendSuccess } from "../../utils/response.ts";
import { Request, Response } from "express";
import {
  getUserByID,
  updateUser,
  updateUserInitialData,
  getAllUsers,
} from "./user.service.ts";
import { generateToken } from "../../utils/jwt.ts";
import { getBookingsAndRecommendations } from "../../services/dashboard.ts";
import { getCollection } from "../db/database.ts";

export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    const updatedUser = await updateUser({
      userId: updateData.userId,
      ...updateData,
    });
    console.log("updatedUser", updatedUser);
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

export const getAllUsersHandler = async (req: Request, res: Response) => {
  console.log("Get all users request received");
  try {
    const { page, limit, search, status } = req.body;
    const users = await getAllUsers({ search, status, page, limit });
    sendSuccess(res, users, "Users retrieved successfully");
  } catch (error) {
    console.error("Error retrieving users:", error);
    sendError(res, 500, "Internal server error");
  }
};

// export const searchUsersHandler = async (req: Request, res: Response) => {
//   try {
//     const { query, status } = req.body;
//     const users = await getAllUsers();

//     // normalize values
//     const q = (query || "").toLowerCase();
//     const s = (status || "").toLowerCase();

//     const filteredUsers = users.filter((user) => {
//       const matchesQuery =
//         !q ||
//         user.name?.toLowerCase().includes(q) ||
//         user.email?.toLowerCase().includes(q) ||
//         user.mobile?.includes(q);

//       const matchesStatus = !s || user.status.toLowerCase() === s;

//       return matchesQuery && matchesStatus;
//     });

//     if (filteredUsers.length === 0) {
//       return sendError(res, 404, "User not found");
//     }

//     return sendSuccess(res, filteredUsers, "Users retrieved successfully");
//   } catch (error) {
//     console.error("Error searching users:", error);
//     return sendError(res, 500, "Internal server error");
//   }
// };

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log("userId", userId);

    const user = await getCollection("users");
    const result = await user.deleteOne({ userId: userId });
    if (result.deletedCount === 0) {
      sendError(res, 404, "User not found");
      return;
    }
    sendSuccess(res, null, "User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    sendError(res, 500, "Internal server error");
  }
};
