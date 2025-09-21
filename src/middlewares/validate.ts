// import { RequestHandler } from "express";
// import { z, ZodObject } from "zod";

// export const validateZod = (schema: ZodObject<any>): RequestHandler => {
//   return (req, res, next) => {
//     const sources = {
//       body: req.body,
//       query: req.query,
//       params: req.params,
//     };

//     console.log(req);

//     let parsedData = null;
//     let firstError = null;

//     for (const [key, data] of Object.entries(sources)) {
//       if (
//         !data ||
//         (typeof data === "object" && Object.keys(data).length === 0)
//       ) {
//         continue;
//       }

//       const result = schema.safeParse(data);
//       if (result.success) {
//         parsedData = result.data;
//         req[key as keyof typeof sources] = parsedData;
//         return next(); // ✅ valid
//       } else {
//         firstError ??= result.error;
//       }
//     }

//     const errors =
//       firstError?.issues.map((err) => ({
//         field: err.path.join("."),
//         message: err.message,
//       })) ?? [];

//     res.status(400).json({ success: false, errors });
//     return; // ✅ ensures type is void
//   };
// };

import { RequestHandler } from "express";
import { ZodObject, ZodError } from "zod";

// export const validateZod = (schema: ZodObject<any>): RequestHandler => {
//   return (req, res, next) => {
//     const sources = {
//       body: req.body,
//       query: req.query,
//       params: req.params,
//     };

//     console.log(sources);

//     // Try validation against each source (body, query, params) using the same schema
//     // Only one must succeed (whichever contains the matching fields)
//     let parsedData = null;
//     let firstError = null;

//     // for (const [key, data] of Object.entries(sources)) {
//     //   const result = schema.safeParse(data);
//     //   if (result.success) {
//     //     parsedData = result.data;

//     //     // ✅ instead of overwriting req.query/params/body, store in req.validated
//     //     if (!(req as any).validated) (req as any).validated = {};
//     //     (req as any).validated[key] = parsedData;

//     //     return next();
//     //   } else {
//     //     firstError ??= result.error;
//     //   }
//     // }

//     const normalize = (obj: any) =>
//       obj && typeof obj === "object" ? { ...obj } : obj;

//     for (const [key, data] of Object.entries(sources)) {
//       const cleanData = normalize(data);
//       console.log(cleanData);

//       if (
//         !cleanData ||
//         (typeof cleanData === "object" && Object.keys(cleanData).length === 0)
//       ) {
//         continue;
//       }

//       const result = schema.safeParse(cleanData);
//       if (result.success) {
//         if (!(req as any).validated) (req as any).validated = {};
//         (req as any).validated[key] = result.data;
//         return next();
//       } else {
//         firstError ??= result.error;
//       }
//     }

//     const errors =
//       firstError?.issues.map((err) => ({
//         field: err.path.join("."),
//         message: err.message,
//       })) ?? [];

//     console.log(errors);

//     res.status(400).json({ success: false, errors });
//     return;
//   };
// };

const normalizeAndMerge = (sources: {
  body?: any;
  query?: any;
  params?: any;
}) => {
  const clean = (obj: any) =>
    obj && typeof obj === "object" ? { ...obj } : {};

  return {
    ...clean(sources.params),
    ...clean(sources.query),
    ...clean(sources.body),
  };
};

export const validateZod = (schema: ZodObject<any>): RequestHandler => {
  return (req, res, next) => {
    const mergedData = normalizeAndMerge({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const result = schema.safeParse(mergedData);

    if (result.success) {
      (req as any).validated = result.data; // store validated data
      return next();
    }

    const errors = result.error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    res.status(400).json({ success: false, errors });
  };
};
