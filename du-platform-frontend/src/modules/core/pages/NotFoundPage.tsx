import RouteSeo from "@/components/RouteSeo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { t } = useTranslation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-slate-950">
      <RouteSeo pathname={location} search={search} />
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-slate-900 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-zim-gold/10 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-zim-gold" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-2">
            {t("notfound.title") || "404"}
          </h1>

          <h2 className="text-xl font-semibold text-white/90 mb-4">
            {t("notfound.subtitle") || "Page Not Found"}
          </h2>

          <p className="text-white/75 mb-8 leading-relaxed">
            {t("notfound.message") ||
              "Sorry, the page you are looking for doesn't exist."}
            <br />
            {t("notfound.message2") || "It may have been moved or deleted."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="min-h-11 bg-zim-gold hover:bg-white text-zim-black px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              {t("notfound.go_home") || "Go Home"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
