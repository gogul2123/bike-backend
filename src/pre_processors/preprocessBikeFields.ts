// import { Request, Response, NextFunction } from "express";

// // Extend Express Request to include multer file
// interface MulterRequest extends Request {
//   file?: Express.Multer.File;
//   body: { [key: string]: any };
// }

// export function preprocessBikeFields(
//   req: MulterRequest,
//   res: Response,
//   next: NextFunction
// ): void {
//   try {
//     if (!req.body) req.body = {};

//     // Convert availability to boolean
//     if ("availability" in req.body) {
//       req.body.availability = req.body.availability === "true";
//     }

//     if ("weekendVariation" in req.body) {
//       req.body.weekendVariation = Number(req.body.weekendVariation);
//     }

//     // Convert price to number
//     if ("price" in req.body) {
//       req.body.price = Number(req.body.price);
//     }

//     // Convert bikes JSON string to array
//     if ("bikes" in req.body) {
//       try {
//         req.body.bikes = JSON.parse(req.body.bikes);
//       } catch (err) {
//         res.status(400).json({ error: "Invalid bikes array format" });
//         return; // ✅ exit middleware without returning the res object
//       }
//     }

//     // Attach file object for Zod validation
//     if (req.file) {
//       req.body.imageFile = req.file;
//     }

//     next(); // continue to next middleware
//   } catch (err) {
//     res.status(400).json({ error: "Invalid input data" });
//     return; // ✅ exit without returning Response
//   }
// }

import { Request, Response, NextFunction } from "express";

// Extend Express Request to include multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  body: { [key: string]: any };
}

export function preprocessBikeFields(
  req: MulterRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.body) req.body = {};

    // Helper function to convert dot notation FormData to nested object
    function formDataToNestedObject(flatObj: { [key: string]: any }) {
      const result: { [key: string]: any } = {};

      Object.keys(flatObj).forEach((key) => {
        const value = flatObj[key];
        const keys = key.split(".");

        keys.reduce((acc, currentKey, index) => {
          // Check if current key is array index
          const isArrayIndex = /^\d+$/.test(currentKey);

          if (index === keys.length - 1) {
            // Last key - assign value with type conversion
            let processedValue = value;

            // Convert string numbers to actual numbers
            if (typeof value === "string") {
              // Check for boolean strings
              if (value === "true") processedValue = true;
              else if (value === "false") processedValue = false;
              // Check for numeric strings
              else if (!isNaN(Number(value)) && value.trim() !== "") {
                processedValue = Number(value);
              }
            }

            acc[currentKey] = processedValue;
          } else {
            // Intermediate key - create nested structure
            const nextKey = keys[index + 1];
            const nextIsArrayIndex = /^\d+$/.test(nextKey);

            if (!acc[currentKey]) {
              acc[currentKey] = nextIsArrayIndex ? [] : {};
            }

            return acc[currentKey];
          }
          return acc;
        }, result);
      });

      return result;
    }

    // Convert flat FormData structure to nested object
    const nestedBody = formDataToNestedObject(req.body);

    // Merge nested structure back to req.body
    req.body = { ...req.body, ...nestedBody };

    // Clean up the dot notation keys from the body
    Object.keys(req.body).forEach((key) => {
      if (key.includes(".")) {
        delete req.body[key];
      }
    });

    // Additional specific conversions for bike schema

    // Convert pricing fields to numbers
    if (req.body.pricing) {
      if (req.body.pricing.basePrice) {
        req.body.pricing.basePrice = Number(req.body.pricing.basePrice);
      }
      if (req.body.pricing.weekendMultiplier) {
        req.body.pricing.weekendMultiplier = Number(
          req.body.pricing.weekendMultiplier
        );
      }
      if (req.body.pricing.taxIncluded !== undefined) {
        req.body.pricing.taxIncluded =
          req.body.pricing.taxIncluded === true ||
          req.body.pricing.taxIncluded === "true";
      }
    }

    // Convert vehicle metadata numbers
    if (req.body.vehicles && Array.isArray(req.body.vehicles)) {
      req.body.vehicles = req.body.vehicles.map((vehicle: any) => {
        if (vehicle.metadata) {
          // Convert totalKms to number
          if (vehicle.metadata.totalKms !== undefined) {
            vehicle.metadata.totalKms = Number(vehicle.metadata.totalKms);
          }

          // Convert date strings to Date objects
          [
            "holdExpiryTime",
            "lastServiceDate",
            "nextServiceDue",
            "purchaseDate",
          ].forEach((dateField) => {
            if (
              vehicle.metadata[dateField] &&
              vehicle.metadata[dateField] !== ""
            ) {
              vehicle.metadata[dateField] = new Date(
                vehicle.metadata[dateField]
              );
            } else if (vehicle.metadata[dateField] === "") {
              delete vehicle.metadata[dateField]; // Remove empty date strings
            }
          });
        }
        return vehicle;
      });
    }

    // Legacy field conversions (keeping for backward compatibility)
    if ("availability" in req.body) {
      req.body.availability = req.body.availability === "true";
    }

    if ("weekendVariation" in req.body) {
      req.body.weekendVariation = Number(req.body.weekendVariation);
    }

    if ("price" in req.body) {
      req.body.price = Number(req.body.price);
    }

    // Convert bikes JSON string to array (legacy)
    if ("bikes" in req.body && typeof req.body.bikes === "string") {
      try {
        req.body.bikes = JSON.parse(req.body.bikes);
      } catch (err) {
        res.status(400).json({ error: "Invalid bikes array format" });
        return;
      }
    }

    // Attach file object for Zod validation
    if (req.file) {
      req.body.imageFile = req.file;
    }

    // Debug log the processed body structure
    console.log(
      "Processed body structure:",
      JSON.stringify(
        req.body,
        (key, value) => {
          if (value instanceof Date) return value.toISOString();
          if (value instanceof Buffer) return "[Buffer]";
          return value;
        },
        2
      )
    );

    next();
  } catch (err) {
    console.error("Preprocessing error:", err);
    res.status(400).json({ error: "Invalid input data processing" });
    return;
  }
}
