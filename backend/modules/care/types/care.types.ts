export type CareProvider = "nyaradzo";

export type CareReferralInput = {
  userId: number;
  provider: CareProvider;
  referralId?: string | null;
};
