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

const router = Router();

// Public routes
router.post(
  "/create-order",
  validateZod(CreateBookingInput),
  createBookingOrder
);
router.get("/health", healthCheck);

// Protected routes (require authentication)
router.get("/getBooking/:bookingId", validateZod(BookingById), getBooking);

router.get(
  "/getBookingsByuser/:userId",
  validateZod(getUserBookingsSchema),
  getUserBookings
);

router.post(
  "/getAdminBookings",
  validateZod(BookingQueryInput),
  getALLBookingsForAdmin
);

router.get(
  "/getBookingStatus/:status",
  validateZod(getBookingsByStatusSchema),
  getBookingsByStatus
);
router.post(
  "/confirmBooking",
  validateZod(completeBookingSchema),
  verifyPayment
);
router.post("/updateBooking", validateZod(UpdateBookingInput), updateBooking);
router.post("/cancelBooking", validateZod(CancelBookingInput), cancelBooking);

// Admin routes
router.post("/cleanup-holds", cleanupExpiredHolds);
router.post("/activate-bookings", activateBookings);
router.post("/completeAllbookings", completeBookings);
router.get("/getAllBookings", validateZod(BookingQueryInput), getBookings);

router.post(
  "/calculateLateCharge",
  validateZod(
    BookingSchema.pick({ bookingId: true }).extend({
      currentDate: z.date(),
    })
  ),
  calculateLateCharge
);

router.post(
  "/completeBookingById",
  validateZod(
    BookingSchema.pick({ bookingId: true }).extend({
      paidAmount: z.number().nonnegative(),
    })
  ),
  completeBookingById
);

export default router;
