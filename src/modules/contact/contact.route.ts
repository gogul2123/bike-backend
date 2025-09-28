import { Router } from "express";
import {
  contactHandler,
  getContactByIdHandler,
  getContactHandler,
  replyContactHandler,
} from "./contact.controller.ts";
import { validateZod } from "../../middlewares/validate.ts";
import {
  Contact,
  contactInput,
  ContactSchema,
  getContact,
  replyContact,
} from "./contact.model.ts";

const router = Router();

router.post("/contact", validateZod(contactInput), contactHandler);
router.get("/getContacts", validateZod(getContact), getContactHandler);
router.post("/contact/reply", validateZod(replyContact), replyContactHandler);
router.get(
  "/contact/:contactId",
  validateZod(ContactSchema.pick({ contactId: true })),
  getContactByIdHandler
);

export default router;
