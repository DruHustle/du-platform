import { createStaticRoute, createRedirectRoute, createLazyRoute } from "../core/routing";
import TourismModulePage from "./pages/TourismModulePage";
export const tourismRoutes = [
  createStaticRoute("/travel", TourismModulePage),
  createStaticRoute("/travel/explore", () => <TourismModulePage explore />),
  createLazyRoute("/travel/flights", () => import("../travel/TravelPage")),
  createLazyRoute("/travel/stays", () => import("../travel/TravelPage")),
  createLazyRoute("/travel/car-hire", () => import("../travel/TravelPage")),
  createLazyRoute("/travel/my-trips", () => import("../travel/TravelPage")),
  createLazyRoute("/travel/weather", () => import("../travel/WeatherPage")),
  createRedirectRoute("/tourism", "/travel"),
  createRedirectRoute("/tourism/", "/travel"),
  createRedirectRoute("/tourism.html", "/travel"),
];
