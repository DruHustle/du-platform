import axios from "axios";
import { TtlCache } from "../../../shared/cache";
import { logger } from "../../../core/logger";
import { ReloadlyProvider, resolveReloadlyAudience } from "../providers/reloadlyGatewayProvider";

type GiftCardProduct = {
  productId: string;
  brandId: string | null;
  name: string;
  category: string;
  countryCode: string;
  countryName: string;
  senderCurrencyCode: string | null;
  recipientCurrencyCode: string | null;
  denominations: string[];
  logoUrl: string | null;
};

const FALLBACK_GIFT_CARD_PRODUCTS: GiftCardProduct[] = [
  { productId: "boomplay-zw", brandId: "boomplay", name: "Boomplay", category: "Music", countryCode: "ZW", countryName: "Zimbabwe", senderCurrencyCode: "USD", recipientCurrencyCode: "USD", denominations: ["5 USD", "10 USD", "20 USD"], logoUrl: null },
  { productId: "razer-gold-zw", brandId: "razer-gold", name: "Razer Gold", category: "Gaming", countryCode: "ZW", countryName: "Zimbabwe", senderCurrencyCode: "USD", recipientCurrencyCode: "USD", denominations: ["5 USD", "10 USD", "25 USD"], logoUrl: null },
  { productId: "xbox-zw", brandId: "xbox", name: "Xbox", category: "Gaming", countryCode: "ZW", countryName: "Zimbabwe", senderCurrencyCode: "USD", recipientCurrencyCode: "USD", denominations: ["10 USD", "25 USD", "50 USD"], logoUrl: null },
  { productId: "roblox-zw", brandId: "roblox", name: "Roblox", category: "Gaming", countryCode: "ZW", countryName: "Zimbabwe", senderCurrencyCode: "USD", recipientCurrencyCode: "USD", denominations: ["10 USD", "25 USD", "50 USD"], logoUrl: null },
  { productId: "tiktok-zw", brandId: "tiktok", name: "TikTok", category: "Social", countryCode: "ZW", countryName: "Zimbabwe", senderCurrencyCode: "USD", recipientCurrencyCode: "USD", denominations: ["5 USD", "10 USD", "20 USD"], logoUrl: null },
  { productId: "discord-nitro-zw", brandId: "discord-nitro", name: "Discord Nitro", category: "Entertainment", countryCode: "ZW", countryName: "Zimbabwe", senderCurrencyCode: "USD", recipientCurrencyCode: "USD", denominations: ["10 USD", "25 USD", "50 USD"], logoUrl: null },
];

function normalizeDenominations(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(0, 8)
    .map((value) => `${value.toFixed(0)} USD`);
}

export class GiftCardService {
  private readonly cache = new TtlCache<GiftCardProduct[]>(5 * 60_000);
  private readonly provider = new ReloadlyProvider();

  private isMockMode() {
    return String(process.env.FINANCIAL_SANDBOX_MOCK ?? "").trim().toLowerCase() === "true";
  }

  private getBaseUrl() {
    return String(process.env.RELOADLY_GIFTCARDS_BASE_URL ?? "https://giftcards-sandbox.reloadly.com").replace(/\/+$/, "");
  }

  private getAudience() {
    return resolveReloadlyAudience(
      process.env.RELOADLY_GIFTCARDS_AUDIENCE,
      this.getBaseUrl(),
      "https://giftcards-sandbox.reloadly.com"
    );
  }

  private async fetchLiveCatalogue(countryCode: string) {
    const token = await this.provider.getAccessToken(this.getAudience());
    const client = axios.create({
      baseURL: this.getBaseUrl(),
      timeout: 20_000,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.giftcards-v1+json",
      },
    });

    const response = await client.get(`/countries/${encodeURIComponent(countryCode)}/products`);
    const products = Array.isArray(response.data?.content)
      ? response.data.content
      : Array.isArray(response.data)
        ? response.data
        : [];

    return products
      .map((item: any): GiftCardProduct => ({
        productId: String(item?.productId ?? item?.id ?? "").trim(),
        brandId: String(item?.brand?.brandId ?? item?.brandId ?? "").trim() || null,
        name: String(item?.productName ?? item?.name ?? "").trim(),
        category: String(item?.category?.name ?? item?.brand?.category ?? item?.category ?? "Gift Cards").trim(),
        countryCode: String(item?.country?.isoName ?? item?.countryCode ?? countryCode).trim().toUpperCase(),
        countryName: String(item?.country?.name ?? item?.countryName ?? countryCode).trim(),
        senderCurrencyCode: String(item?.senderCurrencyCode ?? item?.senderCurrency?.code ?? "").trim().toUpperCase() || null,
        recipientCurrencyCode: String(item?.recipientCurrencyCode ?? item?.recipientCurrency?.code ?? "").trim().toUpperCase() || null,
        denominations: normalizeDenominations(item?.denominationValues ?? item?.fixedRecipientDenominations ?? item?.fixedSenderDenominations),
        logoUrl: String(item?.logoUrls?.[0] ?? item?.logoUrl ?? item?.brand?.logoUrls?.[0] ?? "").trim() || null,
      }))
      .filter((item: GiftCardProduct) => Boolean(item.productId && item.name))
      .slice(0, 24);
  }

  async listCatalogue(countryCode = "ZW") {
    const normalizedCountryCode = String(countryCode ?? "ZW").trim().toUpperCase() || "ZW";
    const cacheKey = `gift-cards:${normalizedCountryCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { products: cached, source: "cache" as const };

    if (this.isMockMode()) {
      this.cache.set(cacheKey, FALLBACK_GIFT_CARD_PRODUCTS);
      return { products: FALLBACK_GIFT_CARD_PRODUCTS, source: "fallback" as const };
    }

    try {
      const products = await this.fetchLiveCatalogue(normalizedCountryCode);
      const resolvedProducts = products.length > 0 ? products : FALLBACK_GIFT_CARD_PRODUCTS;
      this.cache.set(cacheKey, resolvedProducts);
      return { products: resolvedProducts, source: products.length > 0 ? ("provider" as const) : ("fallback" as const) };
    } catch (error) {
      logger.error("gift_cards_catalogue_failed", {
        countryCode: normalizedCountryCode,
        reason: error instanceof Error ? error.message : String(error),
      });
      this.cache.set(cacheKey, FALLBACK_GIFT_CARD_PRODUCTS);
      return { products: FALLBACK_GIFT_CARD_PRODUCTS, source: "fallback" as const };
    }
  }
}
