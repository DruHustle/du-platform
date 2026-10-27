import Layout from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import TravelNav from "./TravelNav";
import SearchPanel from "./SearchPanel";
import MyTrips from "./MyTrips";
import type { TravelCategory } from "@shared/travel";
import "./travel.css";
export default function TravelPage() {
  const [path] = useLocation();
  const section = path.split("/")[2];
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="travel-page">
        <TravelNav />
        <header className="travel-heading">
          <h1 className="page-title">{t(`travel.${section}`)}</h1>
          <p>{t("travel.description")}</p>
        </header>
        {section === "my-trips" ? (
          <MyTrips />
        ) : (
          <SearchPanel category={section as TravelCategory} />
        )}
        <p className="travel-disclosure">
          {t("travel.disclosure")}{" "}
          <Link href="/onesa-ai-chat" className="underline">
            Onesa AI
          </Link>
        </p>
      </div>
    </Layout>
  );
}
