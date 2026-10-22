import { createLazyRoute, createRedirectRoute } from "../core/routing";

export const aiRoutes = [
  createRedirectRoute("/coming-soon", "/onesa-ai-chat"),
  createLazyRoute("/onesa-ai-chat", () => import("./pages/ChatPage")),
  createLazyRoute("/onesa-ai-book-trip", () => import("./pages/BookTripPage")),
  createLazyRoute(
    "/onesa-ai-tourism-virtual-experience",
    () => import("./pages/TourismVirtualExperiencePage")
  ),
  createLazyRoute(
    "/onesa-ai-tourism-augmented-experience",
    () => import("./pages/TourismAugmentedExperiencePage")
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experince",
    "/onesa-ai-tourism-virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experince",
    "/onesa-ai-tourism-augmented-experience"
  ),
];
