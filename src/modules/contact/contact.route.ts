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
import { authorizeRoles } from "../../middlewares/authorizeRole.ts";

const router = Router();

router.post("/contact", validateZod(contactInput), contactHandler);
router.post(
  "/getContacts",
  authorizeRoles(),
  validateZod(getContact),
  getContactHandler
);
router.post(
  "/contact/reply",
  authorizeRoles(),
  validateZod(replyContact),
  replyContactHandler
);
router.get(
  "/contact/:contactId",
  authorizeRoles(),
  validateZod(ContactSchema.pick({ contactId: true })),
  getContactByIdHandler
);

export default router;
