import { Router } from "express";
import { validateZod } from "../../middlewares/validate.ts";
import { z } from "zod";
import {
  createBookingOrder,
  verifyPayment,
  getBooking,
  getBookings,
  getUserBookings,
  getBookingsByStatus,
  updateBooking,
  cancelBooking,
  cleanupExpiredHolds,
  activateBookings,
  completeBookings,
  healthCheck,
  completeBookingById,
  getALLBookingsForAdmin,
  calculateLateCharge,
} from "./booking.controller.ts";
import {
  BookingById,
  BookingQueryInput,
  BookingSchema,
  BookingVehicleSchema,
  CancelBookingInput,
  completeBookingSchema,
  CreateBookingInput,
  getBookingsByStatusSchema,
  getUserBookingsSchema,
  UpdateBookingInput,
} from "./booking.model.ts";
import { BookingVehicleInput } from "../bike/bike.model.ts";
import { authorizeRoles } from "../../middlewares/authorizeRole.ts";

const router = Router();

// Public routes
router.post(
  "/create-order",
  validateZod(CreateBookingInput),
  createBookingOrder
);
router.get("/health", healthCheck);

// Protected routes (require authentication)
router.get(
  "/getBooking/:bookingId",
  authorizeRoles(),
  validateZod(BookingById),
  getBooking
);

router.get(
  "/getBookingsByuser/:userId",
  validateZod(getUserBookingsSchema),
  getUserBookings
);

router.post(
  "/getAdminBookings",
  authorizeRoles(),
  validateZod(BookingQueryInput),
  getALLBookingsForAdmin
);

router.get(
  "/getBookingStatus/:status",
  authorizeRoles(),
  validateZod(getBookingsByStatusSchema),
  getBookingsByStatus
);
router.post(
  "/confirmBooking",
  authorizeRoles(),
  validateZod(completeBookingSchema),
  verifyPayment
);
router.post(
  "/updateBooking",
  authorizeRoles(),
  validateZod(UpdateBookingInput),
  updateBooking
);
router.post(
  "/cancelBooking",
  authorizeRoles(),
  validateZod(CancelBookingInput),
  cancelBooking
);

// Admin routes
router.post("/cleanup-holds", authorizeRoles(), cleanupExpiredHolds);
router.post("/activate-bookings", authorizeRoles(), activateBookings);
router.post("/completeAllbookings", authorizeRoles(), completeBookings);
router.get("/getAllBookings", validateZod(BookingQueryInput), getBookings);

router.post(
  "/calculateLateCharge",
  authorizeRoles(),
  validateZod(
    BookingSchema.pick({ bookingId: true }).extend({
      currentDate: z.date(),
    })
  ),
  calculateLateCharge
);

router.post(
  "/completeBookingById",
  authorizeRoles(),
  validateZod(
    BookingSchema.pick({ bookingId: true }).extend({
      paidAmount: z.number().nonnegative(),
    })
  ),
  completeBookingById
);

export default router;
