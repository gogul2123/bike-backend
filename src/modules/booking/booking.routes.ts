import { Router } from "express";
import { validateZod } from "../../middlewares/validate.ts";
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
} from "./booking.controller.ts";
import {
  BookingQueryInput,
  BookingVehicleSchema,
  CancelBookingInput,
  getBookingsByStatusSchema,
  getUserBookingsSchema,
  UpdateBookingInput,
} from "./booking.model.ts";

const router = Router();

// Public routes
router.post(
  "/create-order",
  validateZod(BookingVehicleSchema),
  createBookingOrder
);
router.get("/health", healthCheck);

// Protected routes (require authentication)
router.get("/:bookingId", getBooking);
router.get("/", validateZod(BookingQueryInput), getBookings);
router.get(
  "/user/:userId",
  validateZod(getUserBookingsSchema),
  getUserBookings
);
router.get(
  "/status/:status",
  validateZod(getBookingsByStatusSchema),
  getBookingsByStatus
);
router.put("/update", validateZod(UpdateBookingInput), updateBooking);
router.post("/cancel", validateZod(CancelBookingInput), cancelBooking);

// Admin routes
router.post("/cleanup-holds", cleanupExpiredHolds);
router.post("/activate-bookings", activateBookings);
router.post("/complete-bookings", completeBookings);

export default router;
