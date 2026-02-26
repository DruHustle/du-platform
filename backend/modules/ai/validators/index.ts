import { validateBody } from '../../../shared/validators';
import { chatRequestSchema, tripPlanSchema } from '../dto/chat.dto';

export const validateChatRequest = validateBody(chatRequestSchema);
export const validateTripPlanRequest = validateBody(tripPlanSchema);
