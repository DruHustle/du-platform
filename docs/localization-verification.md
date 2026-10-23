# Localization verification

`pnpm translations:check` checks all four resource files for identical key shape,
unfinished markers and unapproved English copies. The remaining admin controls,
navigation helpers, loading states and public labels were translated.

The unchanged-message allowlist contains brand names, proper names, official
source citation labels, geographic examples and words genuinely shared with
English (such as German `Name` and `Standard`). These are intentional exceptions,
not substitutes for translating functional interface copy.

Fallback trip-plan prose is shared between the frontend and backend in
`shared/tripPlanCopy.ts`; numeric planning formulas are unchanged. Transactional
shop and newsletter email copy is in `shared/customerEmailCopy.ts`. Supported
language normalization and defaults are shared, and the selected language is
validated by request schemas.

Automated checks cover localized fallback responses, preserved price calculations,
localized and escaped receipts, persistent email language, private stock alerts,
confirmation links and campaign footers. Browser checks cover mobile, tablet and
desktop layouts. These checks are not a native-speaker linguistic review. No
independent native-speaker sign-off has been obtained; editorial approval of
Shona and Ndebele phrasing remains a human review dependency.
