import { validateBody } from '../../../shared/validators';
import { fxQuoteSchema, remittanceSchema } from '../dto/remittance.dto';
import { airtimeLookupSchema, airtimeTopupSchema } from '../dto/airtime.dto';

export const validateFxQuote = validateBody(fxQuoteSchema);
export const validateRemittance = validateBody(remittanceSchema);
export const validateAirtimeLookup = validateBody(airtimeLookupSchema);
export const validateAirtimeTopup = validateBody(airtimeTopupSchema);
