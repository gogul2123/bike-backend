import z from "zod";

export const imageUpload = z.object({
  brand: z.string(),
  model: z.string(),
});
