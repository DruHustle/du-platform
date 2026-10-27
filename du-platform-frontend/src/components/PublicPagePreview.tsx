import React from "react";
import english from "../../public/locales/en/translation.json";
import { resolveRouteSeo } from "../../../shared/routeSeo";
type Product = {
  slug: string;
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
};
const sections = [
  {
    title: "Zimbabwean products",
    href: "/shop/products",
    description:
      "Browse food, drinks, crafts and supporter apparel. Register interest for a one-time availability alert — no order, reservation or payment. Confirm your email separately from the newsletter. Sales are not open yet.",
  },
  {
    title: "Travel Southern Africa",
    href: "/travel",
    description:
      "Search flights to, from and within Southern Africa and research stays. Read regional guides, explore Zimbabwean destinations and draft an itinerary with Onesa. Confirm final prices and conditions directly with providers; car hire uses a public search handoff.",
  },
  {
    title: "Business and innovation",
    href: "/investment",
    description:
      "Explore practical ideas in farming, mining, construction, energy and technology. Start with a small research brief, verify permissions and supplier information, and review project profiles and the business directory as research starting points. Listed profiles are not investment offers or endorsements.",
  },
  {
    title: "Onesa and technology",
    href: "/technology",
    description:
      "Use Onesa for general guidance and links to published catalogue information. Explore clearly labelled virtual and augmented reality demonstrations. Onesa cannot book a trip, take payments or confirm delivery.",
  },
];
export function PublicPagePreview({
  pathname,
  products = [],
}: {
  pathname: string;
  products?: Product[];
}) {
  const seo = resolveRouteSeo({ pathname });
  const draftPolicy = ["/legal-notice", "/delivery-and-returns"].includes(
    pathname
  );
  if (seo.robots.startsWith("noindex") && !draftPolicy) return null;
  const product = products.find(p => pathname === `/shop/product/${p.slug}`);
  const selected =
    pathname === "/"
      ? sections
      : sections.filter(
          s =>
            pathname.startsWith(s.href.split("/").slice(0, 2).join("/")) ||
            (pathname.startsWith("/shop/product/") &&
              s.href.startsWith("/shop"))
        );
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
        aria-label="Main navigation"
        style={{ display: "flex", flexWrap: "wrap", gap: 24 }}
      >
        <a href="/">Home</a>
        {sections.map(s => (
          <a key={s.href} href={s.href}>
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
          <h1 className="seo-h1">Diaspora Unlocked</h1>
          <p>Connecting Zimbabwe, at home and abroad.</p>
          <p>
            Discover products, travel research and practical business ideas.
          </p>
        </header>
      ) : (
        <h1>{product?.name || seo.bodyHeading}</h1>
      )}
      <p>{product?.description || seo.description}</p>
      {draftPolicy && (
        <section>
          <p role="note">{english.pilot.draft_notice}</p>
          <h2>{english.pilot.operator_details_title}</h2>
          <address style={{ fontStyle: "normal" }}>
            {english.pilot.operator_summary}
          </address>
          <p>{english.pilot.operator_missing}</p>
          <h2>{english.pilot.delivery_title}</h2>
          <p>{english.pilot.delivery_draft}</p>
          <p>{english.pilot.payment_draft}</p>
          <h2>{english.pilot.returns_title}</h2>
          <p>{english.pilot.returns_draft}</p>
          <p>{english.pilot.complaints}</p>
        </section>
      )}
      {pathname.startsWith("/travel") && (
        <section>
          <h2>{english.travel.guides}</h2>
          <p>{english.travel.reviewed}</p>
          {Object.entries(english.travel["guides-content"]).map(
            ([id, guide]) => (
              <article key={id}>
                <h3>
                  <a href={`/travel/explore#${id}`}>{guide.title}</a>
                </h3>
                <p>{guide.body}</p>
              </article>
            )
          )}
          <p>{english.travel["coverage-note"]}</p>
          <a href="/travel/flights">Flights</a>
          {" · "}
          <a href="/travel/stays">Stays</a>
          {" · "}
          <a href="/travel/car-hire">Car Hire</a>
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
            indicative catalogue price
          </p>
          <p>{english.pilot.readiness_pending_note}</p>
          <a
            href={`/shop/product/${encodeURIComponent(product.slug)}#interest`}
          >
            Register interest — no order or payment
          </a>
        </section>
      )}
      {selected.map(s => (
        <section key={s.href}>
          <h2>{s.title}</h2>
          <p>{s.description}</p>
          <a href={s.href}>Explore {s.title.toLowerCase()}</a>
        </section>
      ))}
      {(pathname === "/shop" || pathname === "/shop/products") && (
        <section>
          <h2>Product catalogue</h2>
          <ul>
            {products.map(p => (
              <li key={p.slug}>
                <a href={`/shop/product/${p.slug}`}>{p.name}</a> —{" "}
                {p.description}
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer>
        <a href="/legal-notice">Operator and legal notice</a> ·{" "}
        <a href="/delivery-and-returns">
          Draft delivery, payment and returns procedures
        </a>{" "}
        · <a href="/privacy-policy">Privacy</a> ·{" "}
        <a href="/cookie-settings">Cookie preferences</a>
      </footer>
    </main>
  );
}
