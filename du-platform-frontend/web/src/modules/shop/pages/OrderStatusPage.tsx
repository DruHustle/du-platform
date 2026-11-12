import { useLayoutEffect, useState } from "react";
import Layout from "@/components/Layout";
import OrderStatus from "../components/OrderStatus";
import { consumeOrderAccessFragment, getOrderAccessGrant } from "../lib/orderAccess";
import { useTranslation } from "react-i18next";
export default function OrderStatusPage() {
  const { t } = useTranslation();
  const [grant, setGrant] = useState(getOrderAccessGrant);
  useLayoutEffect(() => {
    function readReceipt() {
      if (window.location.hash || !getOrderAccessGrant()) {
        consumeOrderAccessFragment();
      }
      setGrant(getOrderAccessGrant());
    }
    readReceipt();
    window.addEventListener("hashchange", readReceipt);
    return () => window.removeEventListener("hashchange", readReceipt);
  }, []);
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950 text-white">
        <div className="container max-w-2xl">
          <h1 className="page-title">{t("pilot.request_status")}</h1>
          {grant ? (
            <OrderStatus key={grant.token} orderRef={grant.orderRef} token={grant.token} />
          ) : (
            <p>{t("pilot.open_receipt_link")}</p>
          )}
        </div>
      </section>
    </Layout>
  );
}
