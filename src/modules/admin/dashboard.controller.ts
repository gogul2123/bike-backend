import { Request, Response } from "express";
import { getDashboardData } from "./dashboard.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";

export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const data = await getDashboardData();
    console.log("data--->", data);
    sendSuccess(res, data, "Dashboard data fetched successfully");
  } catch (error) {
    sendError(res, 500, "Internal server error");
  }
};
