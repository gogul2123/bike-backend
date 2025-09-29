import { uploadToCloudinary } from "../../uploadService/cloudinary_upload.ts";

export async function uploadBikeImage(
  imageFile: Buffer,
  brand: string,
  model: string
): Promise<string | undefined> {
  try {
    const publicId = `bikes/${brand}_${model}`
      .toLowerCase()
      .replace(/\s+/g, "_");

    const uploadResult: { secure_url?: string } = await uploadToCloudinary(
      imageFile,
      publicId
    );

    return uploadResult.secure_url ?? undefined;
  } catch (error) {
    console.error("Image upload failed:", error);
    return undefined;
  }
}
