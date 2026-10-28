import { validateBody } from "../../../lib/validators";
import { contactInquirySchema } from "../dto/notification.dto";

export const validateContactInquiry = validateBody(contactInquirySchema);
