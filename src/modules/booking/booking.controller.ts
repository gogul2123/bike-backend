import { Request, Response } from "express";
import {
  createBookingOrderService,
  completeBookingPaymentService,
  updateBookingService,
  cancelBookingService,
  getBookingByIdService,
  getBookingsService,
  getUserBookingsService,
  getBookingsByStatusService,
  cleanupExpiredHoldsService,
  activateBookingsService,
  completeBookingsService,
} from "./booking.service.ts";
import { sendError, sendSuccess } from "../../utils/response.ts";

export const createBookingOrder = async (req: Request, res: Response) => {
  try {
    const bookingData = req.body;

    console.log("Received booking data:", bookingData);

    const result = await createBookingOrderService(bookingData);

    sendSuccess(res, result, "Booking order created successfully");
  } catch (err: any) {
    console.error("Error creating booking order:", err);
    sendError(res, 400, err.message);
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const result = await completeBookingPaymentService(
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    console.log("Payment verification result:", result);

    if (result.success && result.booking) {
      sendSuccess(
        res,
        result.booking,
        "Payment verified and booking confirmed"
      );
    } else {
      console.log("Payment verification failed:", result);
      sendError(res, 400, result.error || "Payment verification failed");
    }
  } catch (err: any) {
    console.error("Error verifying payment:", err);
    sendError(res, 500, err.message);
  }
};

export const getBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const booking = await getBookingByIdService(bookingId);

    if (!booking) {
      sendError(res, 404, "Booking not found");
      return;
    }

    sendSuccess(res, booking, "Booking retrieved successfully");
  } catch (err: any) {
    console.error("Error getting booking:", err);
    sendError(res, 500, err.message);
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const filters = req.query;

    const result = await getBookingsService({
      page: filters.page ? parseInt(filters.page as string) : 1,
      limit: filters.limit ? parseInt(filters.limit as string) : 10,
      userId: filters.userId as string,
      status: filters.status as any,
      fromDate: filters.fromDate
        ? new Date(filters.fromDate as string)
        : undefined,
      toDate: filters.toDate ? new Date(filters.toDate as string) : undefined,
      bikeId: filters.bikeId as string,
      vehicleNumber: filters.vehicleNumber as string,
    });

    sendSuccess(res, result, "Bookings retrieved successfully");
  } catch (err: any) {
    console.error("Error getting bookings:", err);
    sendError(res, 500, err.message);
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = "1", limit = "10" } = req.query;

    const result = await getUserBookingsService(
      userId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    sendSuccess(res, result, "User bookings retrieved successfully");
  } catch (err: any) {
    console.error("Error getting user bookings:", err);
    sendError(res, 500, err.message);
  }
};

export const getBookingsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const { page = "1", limit = "10" } = req.query;

    const result = await getBookingsByStatusService(
      status as any,
      parseInt(page as string),
      parseInt(limit as string)
    );

    sendSuccess(res, result, "Bookings by status retrieved successfully");
  } catch (err: any) {
    console.error("Error getting bookings by status:", err);
    sendError(res, 500, err.message);
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;

    const updatedBooking = await updateBookingService(updateData);

    sendSuccess(res, updatedBooking, "Booking updated successfully");
  } catch (err: any) {
    console.error("Error updating booking:", err);
    sendError(res, 400, err.message);
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const cancelData = req.body;

    const cancelledBooking = await cancelBookingService(cancelData);

    sendSuccess(res, cancelledBooking, "Booking cancelled successfully");
  } catch (err: any) {
    console.error("Error cancelling booking:", err);
    sendError(res, 400, err.message);
  }
};

export const cleanupExpiredHolds = async (req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredHoldsService();
    sendSuccess(res, result, "Expired holds cleaned up successfully");
  } catch (err: any) {
    console.error("Error cleaning up expired holds:", err);
    sendError(res, 500, err.message);
  }
};

export const activateBookings = async (req: Request, res: Response) => {
  try {
    const activatedCount = await activateBookingsService();

    sendSuccess(res, { activatedCount }, "Bookings activated successfully");
  } catch (err: any) {
    console.error("Error activating bookings:", err);
    sendError(res, 500, err.message);
  }
};

export const completeBookings = async (req: Request, res: Response) => {
  try {
    const completedCount = await completeBookingsService();
    if (!completedCount) {
      sendError(res, 400, "No bookings to complete");
      return;
    }

    sendSuccess(res, { completedCount }, "Bookings completed successfully");
  } catch (err: any) {
    console.error("Error completing bookings:", err);
    sendError(res, 500, err.message);
  }
};

// Health check endpoint for booking service
export const healthCheck = async (req: Request, res: Response) => {
  try {
    sendSuccess(
      res,
      { status: "OK", timestamp: new Date() },
      "Booking service is healthy"
    );
  } catch (err: any) {
    sendError(res, 500, err.message);
  }
};
