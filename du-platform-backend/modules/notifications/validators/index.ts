import { validateBody } from "../../../shared/validators";
import { contactInquirySchema } from "../dto/notification.dto";

export const validateContactInquiry = validateBody(contactInquirySchema);
