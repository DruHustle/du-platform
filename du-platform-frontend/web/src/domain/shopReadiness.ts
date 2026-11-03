export type PublicShopReadiness = {
  mode: "observe" | "prelaunch" | "pilot";
  enforcement: "report_only" | "enforced";
  commercialReady: boolean;
  missing: string[];
  destinationCountries: string[];
  approvedProductIds?: number[];
};
