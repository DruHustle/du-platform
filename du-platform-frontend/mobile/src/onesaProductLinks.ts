import { shopDestination, type ShopDestination } from "./shopDiscovery";

type ReplyPart = { text: string; destination?: ShopDestination };

function productDestination(href: string, label: string) {
  if (href.length > 1000) return;
  if (href === "/shop/products") return shopDestination(href);
  const base = href.split("#", 1)[0];
  const product = shopDestination(base);
  if (product?.screen !== "Product") return;
  if (base === href) return product;
  if (href === `${base}#interest`) return shopDestination(href, label);
}

// Only turn Onesa's product links into actions. Keep unsupported Markdown literal.
export function onesaProductLinks(content: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  const pattern = /(`+)[\s\S]*?\1|[!\\]?\[([^\[\]\r\n]+)\]\(([^\s()]+)\)/g;
  let offset = 0;
  for (const match of content.matchAll(pattern)) {
    const [markup, , label, href] = match;
    if (!markup.startsWith("[") || !label.trim()) continue;
    const destination = productDestination(href, label);
    if (!destination) continue;
    if (match.index > offset) parts.push({ text: content.slice(offset, match.index) });
    parts.push({ text: label, destination });
    offset = match.index + markup.length;
  }
  if (offset < content.length) parts.push({ text: content.slice(offset) });
  return parts;
}
