import { createStaticRoute, createRedirectRoute } from "../core/routing";
import TourismModulePage from "./pages/TourismModulePage";
import TravelPage from "../travel/TravelPage";
import WeatherPage from "../travel/WeatherPage";
export const tourismRoutes = [
  createStaticRoute("/travel", TourismModulePage),
  createStaticRoute("/travel/explore", () => <TourismModulePage explore />),
  createStaticRoute("/travel/flights", TravelPage),
  createStaticRoute("/travel/stays", TravelPage),
  createStaticRoute("/travel/car-hire", TravelPage),
  createStaticRoute("/travel/my-trips", TravelPage),
  createStaticRoute("/travel/weather", WeatherPage),
  createRedirectRoute("/tourism", "/travel"),
  createRedirectRoute("/tourism/", "/travel"),
  createRedirectRoute("/tourism.html", "/travel"),
];
