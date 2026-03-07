import { createLazyRoute } from "../core/routing";

export const fintechRoutes = [createLazyRoute("/payments", () => import("./pages/PaymentsPage"))];
