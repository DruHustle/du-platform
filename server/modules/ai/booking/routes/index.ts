import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';
import { validateTripPlanRequest } from '../../validators';

export function createAiBookingRouter() {
  const router = Router();
  const controller = new BookingController();
  router.post('/', validateTripPlanRequest, controller.planTrip);
  return router;
}
