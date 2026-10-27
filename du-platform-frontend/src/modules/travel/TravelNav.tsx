import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
export default function TravelNav() {
  const [path] = useLocation();
  const { t, i18n } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({
        left: active.offsetLeft - nav.offsetLeft - 20,
        behavior: "auto",
      });
    }
  }, [path, i18n.language]);
  return (
    <nav
      ref={navRef}
      className="travel-nav"
      aria-label={t("travel.navigation")}
    >
      {[
        ["", "overview"],
        ["flights", "flights"],
        ["stays", "stays"],
        ["car-hire", "car-hire"],
        ["my-trips", "my-trips"],
        ["weather", "weather"],
        ["explore", "explore"],
      ].map(([route, label]) => (
        <Link
          key={label}
          href={`/travel${route ? "/" + route : ""}`}
          aria-current={
            path === `/travel${route ? "/" + route : ""}` ? "page" : undefined
          }
        >
          {t(`travel.${label}`)}
        </Link>
      ))}
    </nav>
  );
}
