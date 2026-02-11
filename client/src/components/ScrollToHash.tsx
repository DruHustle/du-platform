import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ScrollToHash() {
  const [location] = useLocation();

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      } else {
        // Only scroll to top if we don't have a hash
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    };

    // Small delay to ensure the DOM is rendered
    const timer = setTimeout(scrollToHash, 100);

    // Also listen for hashchange events for same-page navigation
    window.addEventListener("hashchange", scrollToHash);
    
    // Listen for popstate for browser back/forward with hashes
    window.addEventListener("popstate", scrollToHash);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToHash);
      window.removeEventListener("popstate", scrollToHash);
    };
  }, [location]); // Re-run when location (path) changes

  return null;
}
