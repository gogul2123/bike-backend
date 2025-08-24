import streamifier from "streamifier";
import cloudinary from "../config/cloudinary_config.ts";

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  [key: string]: any;
}

export function uploadToCloudinary(
  fileBuffer: Buffer,
  publicId: string,
  folder: string = "bikes"
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        use_filename: true,
        unique_filename: false,
      },
      (error: any, result: any) => {
        if (error) return reject(error);
        resolve(result as CloudinaryUploadResult);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}
