import { validateBody } from '../../../shared/validators';
import { fxQuoteSchema, remittanceSchema } from '../dto/remittance.dto';
import { airtimeLookupSchema, airtimeTopupSchema } from '../dto/airtime.dto';
import { electricityOptionsSchema, electricityPaymentSchema } from "../dto/utility.dto";

export const validateFxQuote = validateBody(fxQuoteSchema);
export const validateRemittance = validateBody(remittanceSchema);
export const validateAirtimeLookup = validateBody(airtimeLookupSchema);
export const validateAirtimeTopup = validateBody(airtimeTopupSchema);
export const validateElectricityOptions = validateBody(electricityOptionsSchema);
export const validateElectricityPayment = validateBody(electricityPaymentSchema);
