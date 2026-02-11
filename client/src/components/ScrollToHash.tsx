import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ScrollToHash() {
  const [location] = useLocation();

  useEffect(() => {
    // Small delay to ensure the DOM is rendered
    const timer = setTimeout(() => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          // Calculate header height (approx 72px for h-18)
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      } else {
        // If no hash, scroll to top on route change
        window.scrollTo(0, 0);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location]); // Re-run when location changes

  return null;
}
