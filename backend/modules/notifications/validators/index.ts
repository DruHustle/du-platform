import { validateBody } from "../../../shared/validators";
import { contactInquirySchema, newsletterSubscriptionSchema } from "../dto/notification.dto";

export const validateNewsletterSubscription = validateBody(newsletterSubscriptionSchema);
export const validateContactInquiry = validateBody(contactInquirySchema);
