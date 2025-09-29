import { z } from "zod";

export const contactInput = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .max(10, "Invalid phone number")
    .regex(/^\d+$/, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export const getContact = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
});

export const replyContact = z.object({
  contactId: z.string().min(1, "ContactId is required"),
  message: z.string().min(1, "Message is required"),
  email: z.string().email("Invalid email address"),
});

export const ContactSchema = contactInput.extend({
  contactId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(["PENDING", "RESOLVED"]),
  reply: z.string().optional(),
});

export type Contact = z.infer<typeof ContactSchema>;
export type ContactInput = z.infer<typeof contactInput>;
