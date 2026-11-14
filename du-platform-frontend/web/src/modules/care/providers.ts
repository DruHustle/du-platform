export type CareGoal = "funeral" | "repatriation";
export const providerPages = {
  zb: "https://www.zb.co.zw/diaspora/cash-funeral-plan",
  diaspora: "https://diasporainsurance.com/zimbabwe/",
  doves: "https://doves.co.zw/global-plan/",
};
export type Provider = keyof typeof providerPages;

export function careProviders(goal: CareGoal, applicant: string, covered: string): Provider[] {
  if (!applicant || !covered || applicant === "ZW") return [];
  if (goal === "funeral") return covered === "ZW" ? ["zb", "diaspora"] : [];
  return covered !== "ZW" ? ["doves", "diaspora"] : [];
}
