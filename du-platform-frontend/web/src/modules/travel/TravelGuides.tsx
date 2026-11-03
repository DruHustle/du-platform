import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
export const travelGuides = [
  {
    id: "zimbabwe-routes",
    category: "flights",
    source:
      "https://www.flyairlink.com/sites/default/files/files/4Z-CONDITIONS_of_CARRIAGE.pdf",
  },
  {
    id: "johannesburg-victoria-falls",
    category: "flights",
    source:
      "https://www.gov.uk/foreign-travel-advice/zimbabwe/entry-requirements",
  },
  {
    id: "cape-town-families",
    category: "stays",
    source: "https://www.capetown.travel/travelwise/",
  },
  {
    id: "car-hire-deposits",
    category: "car-hire",
    source: "https://www.discovercars.com/terms-and-conditions",
  },
];
export default function TravelGuides() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  return (
    <section className="travel-guides" aria-labelledby="travel-guides-title">
      <h2 id="travel-guides-title" className="page-section-title">
        {t("travel.guides")}
      </h2>
      <p>{t("travel.reviewed")}</p>
      <div className="travel-guides-grid">
        {travelGuides.map(g => (
          <article id={g.id} key={g.id} className="content-panel">
            <h3>{t(`travel.guides-content.${g.id}.title`)}</h3>
            <p>{t(`travel.guides-content.${g.id}.body`)}</p>
            <a href={g.source} target="_blank" rel="noopener noreferrer">
              {t("travel.source")}
            </a>
            <div className="travel-actions">
              <Button asChild>
                <Link href={`/travel/${g.category}`}>
                  {t(`travel.${g.category}`)}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `https://www.diasporaunlocked.com/travel/explore#${g.id}`
                    );
                    setMessage(t("travel.copied"));
                  } catch {
                    setMessage(t("travel.copy-error"));
                  }
                }}
              >
                {t("travel.share-guide")}
              </Button>
            </div>
          </article>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
      <h2 className="page-section-title mt-8">{t("travel.coverage")}</h2>
      <p>{t("travel.coverage-note")}</p>
    </section>
  );
}
