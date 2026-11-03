import Layout from "@/components/Layout";
import OrderStatus from "../components/OrderStatus";
import { getOrderAccessGrant } from "../lib/orderAccess";
import { useTranslation } from "react-i18next";
export default function OrderStatusPage() {
  const { t } = useTranslation();
  const grant = getOrderAccessGrant();
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950 text-white">
        <div className="container max-w-2xl">
          <h1 className="page-title">{t("pilot.request_status")}</h1>
          {grant ? (
            <OrderStatus orderRef={grant.orderRef} token={grant.token} />
          ) : (
            <p>{t("pilot.open_receipt_link")}</p>
          )}
        </div>
      </section>
    </Layout>
  );
}
