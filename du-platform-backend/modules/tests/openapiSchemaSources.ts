import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  profileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../auth/dto/auth.dto";
import {
  travelCriteriaSchema,
  travelQuoteSchema,
  travelResultsSchema,
  travelDraftSchema,
  savedTravelSchema,
} from "../../domain/travel";
import { shopOrderRequestSchema } from "../../domain/shopCheckout";
import { productDetailsSchema } from "../../domain/productDetails";
import { tripPlanSchema } from "../../domain/tripPlanning";
import { restockNotificationSchema } from "../shop/dto/shop.dto";
import { contactInquirySchema } from "../notifications/dto/notification.dto";
import { subscriptionSchema } from "../newsletter/routes";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "../../domain/passwordPolicy";

// These are backend-owned validators. No frontend code or generated client is
// imported into the API. Structural constraints in the published document must
// stay aligned with the parsers that accept requests and normalize responses.
export const schemaSources: Record<
  string,
  { schema: z.ZodType; io: "input" | "output" }
> = {
  Credentials: { schema: loginSchema, io: "input" },
  Registration: { schema: registerSchema, io: "input" },
  Profile: { schema: profileSchema, io: "input" },
  ForgotPassword: { schema: forgotPasswordSchema, io: "input" },
  ResetPassword: { schema: resetPasswordSchema, io: "input" },
  TravelCriteria: { schema: travelCriteriaSchema, io: "input" },
  TravelQuote: { schema: travelQuoteSchema, io: "input" },
  TravelResults: { schema: travelResultsSchema, io: "output" },
  TravelDraft: { schema: travelDraftSchema, io: "input" },
  SavedTravelInput: { schema: savedTravelSchema, io: "input" },
  OrderRequest: { schema: shopOrderRequestSchema, io: "input" },
  RestockNotification: { schema: restockNotificationSchema, io: "input" },
  ContactInquiry: { schema: contactInquirySchema, io: "input" },
  NewsletterSubscription: { schema: subscriptionSchema, io: "input" },
  ProductDetails: { schema: productDetailsSchema, io: "output" },
  TripPlan: { schema: tripPlanSchema, io: "output" },
};

export function publishedSourceSchema(name: string) {
  const source = schemaSources[name];
  const { $schema: _dialect, ...schema } = z.toJSONSchema(source.schema, {
    io: source.io,
  }) as any;
  // A superRefine policy is not emitted by the JSON Schema exporter. Publish
  // its scalar constraints explicitly; password confirmation remains a rule
  // in the operation description because it compares two input properties.
  if (name === "Registration" || name === "ResetPassword") {
    Object.assign(schema.properties.password, {
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
      pattern:
        "^(?=[\\s\\S]*[A-Z])(?=[\\s\\S]*[0-9])(?=[\\s\\S]*[^A-Za-z0-9])[\\s\\S]*$",
    });
  }
  return schema;
}
