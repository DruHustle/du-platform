import { createLazyRoute, createRedirectRoute } from "../core/routing";
export const aiRoutes = [
  createRedirectRoute("/coming-soon", "/onesa-ai-chat"),
  createLazyRoute("/onesa-ai-chat", () => import("./pages/ChatPage")),
  createLazyRoute("/travel/planner", () => import("./pages/BookTripPage")),
  createLazyRoute(
    "/travel/virtual-experience",
    () => import("./pages/TourismVirtualExperiencePage")
  ),
  createLazyRoute(
    "/travel/augmented-experience",
    () => import("./pages/TourismAugmentedExperiencePage")
  ),
  createRedirectRoute("/onesa-ai-book-trip", "/travel/planner"),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experience",
    "/travel/virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experince",
    "/travel/virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experience",
    "/travel/augmented-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experince",
    "/travel/augmented-experience"
  ),
  createRedirectRoute("/onesa-ai-book-trip/", "/travel/planner"),
  createRedirectRoute("/onesa-ai-book-trip.html", "/travel/planner"),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experience/",
    "/travel/virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experience.html",
    "/travel/virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experince/",
    "/travel/virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-virtual-experince.html",
    "/travel/virtual-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experience/",
    "/travel/augmented-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experience.html",
    "/travel/augmented-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experince/",
    "/travel/augmented-experience"
  ),
  createRedirectRoute(
    "/onesa-ai-tourism-augmented-experince.html",
    "/travel/augmented-experience"
  ),
];
