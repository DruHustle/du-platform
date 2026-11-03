import type { AppRouteDefinition } from "./core/routing";
import { adminRoutes } from "./admin/routes";
import { aiRoutes } from "./ai/routes";
import { authRoutes } from "./auth/routes";
import { coreRoutes } from "./core/routes";
import { homeRoutes } from "./home/routes";
import { investmentRoutes } from "./investment/routes";
import { legalRoutes } from "./legal/routes";
import { searchRoutes } from "./search/routes";
import { shopRoutes } from "./shop/routes";
import { technologyRoutes } from "./technology/routes";
import { tourismRoutes } from "./tourism/routes";

export const appRoutes: AppRouteDefinition[] = [
  ...homeRoutes,
  ...tourismRoutes,
  ...investmentRoutes,
  ...technologyRoutes,
  ...shopRoutes,
  ...authRoutes,
  ...legalRoutes,
  ...aiRoutes,
  ...adminRoutes,
  ...searchRoutes,
  ...coreRoutes,
];
