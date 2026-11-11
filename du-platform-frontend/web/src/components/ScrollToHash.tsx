import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

export default function ScrollToHash() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    const scrollToHash = (behavior: ScrollBehavior = "instant") => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior,
          });
        }
      } else {
        // Only scroll to top if we don't have a hash
        window.scrollTo({
          top: 0,
          behavior: "instant",
        });
      }
    };

    // The route has committed, including lazy content. Reset before the first paint
    // instead of showing the destination at the old scroll position for 100 ms.
    scrollToHash();
    // The homepage grows as its route and catalogues finish loading. Keep a
    // direct link to the download panel visible until the visitor interacts.
    let initialAnchor: ResizeObserver | undefined;
    const intentEvents = ["wheel", "touchstart", "pointerdown", "keydown", "focusin", "hashchange"] as const;
    const stopFollowing = () => {
      initialAnchor?.disconnect();
      for (const event of intentEvents) window.removeEventListener(event, stopFollowing, true);
    };
    if (window.location.hash === "#mobile-apps-title") {
      const revealPanel = () => {
        const panel = document.getElementById("mobile-apps-title")?.closest("section");
        if (!panel) return;
        const { top, bottom } = panel.getBoundingClientRect();
        if (top < 80 || bottom > window.innerHeight) {
          panel.scrollIntoView({ block: "center", behavior: "instant" });
        }
      };
      initialAnchor = new ResizeObserver(revealPanel);
      initialAnchor.observe(document.body);
      for (const event of intentEvents) window.addEventListener(event, stopFollowing, { capture: true, passive: true });
      revealPanel();
    }
    const handleHashChange = () =>
      scrollToHash(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth"
      );

    // Also listen for hashchange events for same-page navigation
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      stopFollowing();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [location]); // Re-run when location (path) changes

  return null;
}
