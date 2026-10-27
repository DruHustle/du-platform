import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
export default function TravelNav() {
  const [path] = useLocation();
  const { t } = useTranslation();
  return (
    <nav className="travel-nav" aria-label={t("travel.navigation")}>
      {[
        ["", "overview"],
        ["flights", "flights"],
        ["stays", "stays"],
        ["car-hire", "car-hire"],
        ["explore", "explore"],
        ["my-trips", "my-trips"],
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
