import multer, { FileFilterCallback } from "multer";
import { NextFunction, Request, Response } from "express";

// const fileFilter = (
//   req: Request,
//   file: Express.Multer.File,
//   cb: FileFilterCallback
// ): void => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true); // Accept the file
//   } else {
//     cb(new Error("Only image files are allowed"));
//   }
// };

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Allowed MIME types
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .png, .webp image files are allowed")); // ❌ Reject
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function optionalFileUpload(fieldName: string) {
  const singleUpload = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
      singleUpload(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    } else {
      next();
    }
  };
}

export const requiredFileUpload = [
  upload.single("imageFile"),
  (req: Request, res: any, next: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }
    next();
  },
];

export { upload, optionalFileUpload };
