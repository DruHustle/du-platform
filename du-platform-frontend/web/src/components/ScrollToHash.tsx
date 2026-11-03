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
    const handleHashChange = () =>
      scrollToHash(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth"
      );

    // Also listen for hashchange events for same-page navigation
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [location]); // Re-run when location (path) changes

  return null;
}
