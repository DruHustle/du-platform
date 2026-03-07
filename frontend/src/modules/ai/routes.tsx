import { createLazyRoute } from "../core/routing";

export const aiRoutes = [
  createLazyRoute("/onesa-ai-chat", () => import("./pages/OnesaAIChatPage"), { prefetchOnIdle: true }),
  createLazyRoute("/onesa-ai-book-trip", () => import("./pages/OnesaAIBookTripPage"), { prefetchOnIdle: true }),
  createLazyRoute("/onesa-ai-tourism-virtual-experience", () => import("./pages/OnesaAITourismVirtualExperiencePage")),
  createLazyRoute("/onesa-ai-tourism-augmented-experience", () => import("./pages/OnesaAITourismAugmentedExperiencePage")),
  createLazyRoute("/onesa-ai-tourism-virtual-experince", () => import("./pages/OnesaAITourismVirtualExperiencePage")),
  createLazyRoute("/onesa-ai-tourism-augmented-experince", () => import("./pages/OnesaAITourismAugmentedExperiencePage")),
];
