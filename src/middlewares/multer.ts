import multer, { FileFilterCallback } from "multer";
import { NextFunction, Request, Response } from "express";

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 },
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
      // skip multer if no file
      next();
    }
  };
}

export { upload, optionalFileUpload };
