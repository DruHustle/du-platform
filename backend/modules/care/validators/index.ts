import { validateBody } from "../../../shared/validators";
import { careReferralSchema } from "../dto/care.dto";

export const validateCareReferral = validateBody(careReferralSchema);
