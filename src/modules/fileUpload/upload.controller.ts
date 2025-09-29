import { Request, Response } from "express";
import { uploadBikeImage } from "./upload.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";

export const imageUploadHanlder = async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      imageFile: req.file?.buffer,
    };
    const url = await uploadBikeImage(data.imageFile, data.brand, data.model);
    if (!url) {
      sendError(res, 400, "Image upload failed");
      return;
    }
    sendSuccess(res, url, "Image uploaded successfully");
  } catch (error) {
    sendError(res, 500, "Internal Server Error");
  }
};
