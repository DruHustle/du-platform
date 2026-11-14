import React from "react";
import { travelGuides } from "../domain/travelGuides";
import english from "../../public/locales/en/translation.json";
import { providerPages } from "../modules/care/providers";
import businessGuideTitles from "../domain/businessGuideTitles.json";
import { resolveRouteSeo } from "../domain/routeSeo";
type Product = {
  slug: string;
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
};
export function PublicPagePreview({
  pathname, products = [], copy = english, language = "en", seo = resolveRouteSeo({ pathname }),
}: {
  pathname: string;
  products?: Product[];
  copy?: typeof english;
  language?: string;
  seo?: ReturnType<typeof resolveRouteSeo>;
}) {
  const sections = [
    { href: "/shop", ...copy.home.tiles.shop },
    { href: "/care", ...copy.home.tiles.care },
    { href: "/onesa", ...copy.home.tiles.onesa },
    { href: "/business-guides", ...copy.home.tiles.business },
  ];
  function href(path: string) {
    if (language === "en") return path;
    const url = new URL(path, "https://www.diasporaunlocked.com");
    url.searchParams.set("lng", language);
    return url.pathname + url.search + url.hash;
  }
  const draftPolicy = ["/legal-notice", "/delivery-and-returns"].includes(
    pathname,
  );
  if (seo.robots.startsWith("noindex") && !draftPolicy) return null;
  const guideSlug = pathname.split("/")[2];
  const guide =
    pathname.startsWith("/business-guides/") &&
    Object.hasOwn(businessGuideTitles, guideSlug)
      ? copy.investment.opportunities[
          guideSlug as keyof typeof businessGuideTitles
        ]
      : undefined;
  const product = products.find((p) => pathname === `/shop/product/${p.slug}`);
  return (
    <main
      className="public-preview"
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "5rem 1.5rem",
        color: "#f8fafc",
        fontFamily: "Inter,system-ui,sans-serif",
        lineHeight: 1.7,
      }}
    >
      <nav
        aria-label={copy.nav.menu}
        style={{ display: "flex", flexWrap: "wrap", gap: 24 }}
      >
        <a href={href("/")}>{copy.nav.home}</a>
        <a href={href("/travel")}>{copy.nav.tourism}</a>
        {sections.map((s) => (
          <a key={s.href} href={href(s.href)}>
            {s.title}
          </a>
        ))}
      </nav>
      {pathname === "/" ? (
        <header
          style={{
            minHeight: "65svh",
            display: "grid",
            placeContent: "center",
            textAlign: "center",
          }}
        >
          <img
            src="/images/brand/diaspora_unlocked_336.webp"
            alt="Diaspora Unlocked"
            width="112"
            height="112"
            style={{ margin: "auto" }}
          />
          <h1>{copy.home.hero_title}</h1>
          <p>{copy.home.hero_subtitle}</p>
          <div>
            <a href={href("/travel/flights")}>{copy.home.flights_action}</a> ·{" "}
            <a href={href("/travel/stays")}>{copy.home.stays_action}</a>
          </div>
        </header>
      ) : (
        <h1>{product?.name || seo.bodyHeading}</h1>
      )}
      {pathname !== "/" && <p>{product?.description || seo.description}</p>}
      {draftPolicy && (
        <section>
          <p role="note">{copy.pilot.draft_notice}</p>
          <h2>{copy.pilot.operator_details_title}</h2>
          <address style={{ fontStyle: "normal" }}>
            {copy.pilot.operator_summary}
          </address>
          <p>{copy.pilot.operator_missing}</p>
          <h2>{copy.pilot.delivery_title}</h2>
          <p>{copy.pilot.delivery_draft}</p>
          <p>{copy.pilot.payment_draft}</p>
          <h2>{copy.pilot.returns_title}</h2>
          <p>{copy.pilot.returns_draft}</p>
          <p>{copy.pilot.complaints}</p>
        </section>
      )}
      {["/travel", "/travel/explore", "/travel/flights", "/travel/stays", "/travel/car-hire"].includes(pathname) && (
        <section>
          <h2>{copy.travel.guides}</h2>
          <p>{copy.travel.reviewed}</p>
          {travelGuides
            .filter(({ category }) => pathname === "/travel" || pathname === "/travel/explore" || pathname === `/travel/${category}`)
            .map(({ id }) => {
              const guide = copy.travel["guides-content"][id];
              return <article key={id}>
                <h3><a href={href(`/travel/explore#${id}`)}>{guide.title}</a></h3>
                <p>{guide.body}</p>
              </article>;
            })}
          <p>{copy.travel["coverage-note"]}</p>
          <a href={href("/travel/flights")}>{copy.travel.flights}</a>
          {" · "}
          <a href={href("/travel/stays")}>{copy.travel.stays}</a>
          {" · "}
          <a href={href("/travel/car-hire")}>{copy.travel["car-hire"]}</a>
        </section>
      )}
      {product && (
        <section>
          <img
            src={product.image_url}
            alt={product.name}
            width="360"
            height="360"
            style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }}
          />
          <p>
            {(product.price_cents / 100).toFixed(2)} {product.currency} ·
            {" "}{copy.product_interest.indicative_price}
          </p>

          <a
            href={href(`/shop/product/${encodeURIComponent(product.slug)}#interest`)}
          >
            {copy.product_interest.view_product}
          </a>
        </section>
      )}
      {pathname === "/" &&
        sections.map((s) => (
          <section key={s.href}>
            <h2>{s.title}</h2>
            <p>{s.description}</p>
            <a href={href(s.href)}>{s.stats}</a>
          </section>
        ))}
      {pathname === "/care" && (
        <section>
          <h2>{copy.care.funeral}</h2>
          <p>{copy.care.providers.zb.body}</p>
          <a href={providerPages.zb} rel="noreferrer">
            {copy.care.providers.zb.action}
          </a>
          <p>{copy.care.providers.diaspora.body}</p>
          <a href={providerPages.diaspora} rel="noreferrer">
            {copy.care.providers.diaspora.action}
          </a>
          <h2>{copy.care.repatriation}</h2>
          <p>{copy.care.providers.doves.body}</p>
          <a href={providerPages.doves} rel="noreferrer">
            {copy.care.providers.doves.action}
          </a>
          <p>{copy.care.handoff}</p>
        </section>
      )}
      {pathname === "/onesa" && (
        <section>
          <a href={href("/travel/planner?example=victoria-falls-3-days")}>
            {copy.tech.tools.trip.cta}
          </a>{" "}
          · <a href={href("/onesa-ai-chat")}>{copy.tech.tools.chat.cta}</a>
        </section>
      )}
      {guide && (
        <section>
          <p>{guide.summary}</p>
          <p>{guide.start}</p>
          <p>{guide.checks}</p>
          <a href={href("/regulations#due-diligence-checklist")}>
            {copy.investment.plan.cta}
          </a>
        </section>
      )}
      {["/business-guides", "/investment"].includes(pathname) && (
        <section>
          <ul>
            {Object.keys(businessGuideTitles).map((slug) => (
              <li key={slug}>
                <a href={href(`/business-guides/${slug}`)}>{copy.investment.opportunities[slug as keyof typeof businessGuideTitles].title}</a>
              </li>
            ))}
          </ul>
          <a href={href("/regulations#due-diligence-checklist")}>
            {copy.investment.plan.cta}
          </a>
          <p>
            {copy.investment.plan.checklist_description}
          </p>
          <a href={href("/ntir")}>{copy.investment.ntir.title}</a> ·{" "}
          <a href={href("/investment/opportunities")}>{copy.nav.active_projects}</a>
        </section>
      )}
      {(pathname === "/shop" || pathname === "/shop/products") && (
        <section>
          <h2>{copy.shop.products.title}</h2>
          <ul>
            {products.map((p) => (
              <li key={p.slug}>
                <a href={href(`/shop/product/${p.slug}`)}>{p.name}</a> —{" "}
                {p.description}
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer>
        <a href={href("/legal-notice")}>{copy.pilot.operator_title}</a> ·{" "}
        <a href={href("/delivery-and-returns")}>
          {copy.pilot.procedures_title}
        </a>{" "}
        · <a href={href("/privacy-policy")}>{copy.privacy_policy}</a> ·{" "}
        <a href={href("/cookie-settings")}>{copy.cookies.settings.title}</a>
      </footer>
    </main>
  );
}
