import BookTripPage from "./pages/BookTripPage";
import ChatPage from "./pages/ChatPage";
import TourismAugmentedExperiencePage from "./pages/TourismAugmentedExperiencePage";
import TourismVirtualExperiencePage from "./pages/TourismVirtualExperiencePage";
import { createRedirectRoute, createStaticRoute } from "../core/routing";

export const aiRoutes = [
  createStaticRoute("/onesa-ai-chat", ChatPage),
  createStaticRoute("/onesa-ai-book-trip", BookTripPage),
  createStaticRoute("/onesa-ai-tourism-virtual-experience", TourismVirtualExperiencePage),
  createStaticRoute("/onesa-ai-tourism-augmented-experience", TourismAugmentedExperiencePage),
  createRedirectRoute("/onesa-ai-tourism-virtual-experince", "/onesa-ai-tourism-virtual-experience"),
  createRedirectRoute("/onesa-ai-tourism-augmented-experince", "/onesa-ai-tourism-augmented-experience"),
];
