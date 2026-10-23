import React from "react";
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
      "Browse food, drinks, crafts and supporter apparel. Add available products to a basket and send an assisted order request. The shop checks availability and your delivery destination before issuing a final quote; no payment is taken on the website.",
  },
  {
    title: "Travel research",
    href: "/tourism",
    description:
      "Explore Zimbabwean destinations and prepare a sample itinerary. Research Victoria Falls, Hwange, Harare, Bulawayo, Great Zimbabwe and the Eastern Highlands. Confirm transport, accommodation, visiting times and prices directly with providers. Sample trip budgets are planning allowances, not bookings or live quotations.",
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
  if (seo.robots.startsWith("noindex")) return null;
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
            src="/images/brand/diaspora_unlocked.png"
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
          <a href="/shop/products">Browse products</a>
        </header>
      ) : (
        <h1>{product?.name || seo.bodyHeading}</h1>
      )}
      <p>{product?.description || seo.description}</p>
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
          <p>
            Check current availability in the live catalogue. Product
            specifications and delivery eligibility must be confirmed before
            accepting a quote.
          </p>
          <a
            href={`/shop/products?product=${encodeURIComponent(product.slug)}`}
          >
            View in the catalogue
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
