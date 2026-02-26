import type express from 'express';
import { BookingService } from '../services/bookingService';
import { ok, error } from '../../../../shared/responseFormatter';

export class BookingController {
  constructor(private readonly service = new BookingService()) {}

  planTrip = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.buildTripPlan({
        ...req.body,
        userId: Number(req.auth?.userId ?? 0) || undefined,
      });
      return res.json(ok(result));
    } catch (err) {
      return res.status(500).json(error('AI_BOOKING_FAILED', err instanceof Error ? err.message : 'Trip planning failed.'));
    }
  };
}
