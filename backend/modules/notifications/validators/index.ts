import { validateBody } from "../../../shared/validators";
import { newsletterSubscriptionSchema } from "../dto/notification.dto";

export const validateNewsletterSubscription = validateBody(newsletterSubscriptionSchema);
