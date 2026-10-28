import {
  createNtirEntity,
  getNtirEntities,
  updateNtirEntity,
} from "../../../lib/persistence/investmentStore";
import { getFeatureNotifications } from "../../../lib/persistence/notificationStore";
import { createSuccessStory, getSuccessStories, updateSuccessStory } from "../../../lib/persistence/impactStore";
import { getAdminSetting, upsertAdminSetting } from "../../../lib/persistence/settingsStore";
import {
  createShopProductAdmin,
  deleteShopProductAdmin,
  getShopProductById,
  getShopProductsAdmin,
  getShopRestockNotifications,
  updateShopProductAdmin,
} from "../../../lib/persistence/shopStore";

export class AdminRepository {
  getNotificationSetting(key: string) {
    return getAdminSetting(key);
  }

  upsertNotificationSetting(key: string, value: string | null) {
    return upsertAdminSetting(key, value);
  }

  listFeatureNotifications() {
    return getFeatureNotifications();
  }

  listShopRestockNotifications() {
    return getShopRestockNotifications();
  }

  listNtirEntries() {
    return getNtirEntities();
  }

  createNtirEntry(
    name: string,
    sector: string,
    location: string,
    verificationStatus: "Verified" | "Pending"
  ) {
    return createNtirEntity(name, sector, location, verificationStatus);
  }

  updateNtirEntry(
    id: number,
    payload: Partial<{ name: string; sector: string; location: string; verification_status: "Verified" | "Pending" }>
  ) {
    return updateNtirEntity(id, payload);
  }

  listImpactStories() {
    return getSuccessStories(true);
  }

  createImpactStory(payload: {
    title: string;
    category: string;
    image: string;
    story: string;
    testimonial: string;
    author: string;
    role: string;
    revenue: string;
    jobs: string;
    markets: string;
    is_published: 0 | 1;
  }) {
    return createSuccessStory(payload);
  }

  updateImpactStory(
    id: number,
    payload: {
      title?: string;
      category?: string;
      image?: string;
      story?: string;
      testimonial?: string;
      author?: string;
      role?: string;
      revenue?: string;
      jobs?: string;
      markets?: string;
      is_published?: 0 | 1;
    }
  ) {
    return updateSuccessStory(id, payload);
  }

  listShopProducts() {
    return getShopProductsAdmin();
  }

  getShopProductById(id: number) {
    return getShopProductById(id);
  }

  createShopProduct(payload: {
    slug: string;
    name: string;
    category: "sports" | "crafts" | "food" | "beverage";
    description: string;
    image_url: string;
    price_cents: number;
    currency: string;
    stock_qty: number;
    is_active: 0 | 1;
  }) {
    return createShopProductAdmin(payload);
  }

  updateShopProduct(
    id: number,
    payload: Partial<{
      slug: string;
      name: string;
      category: "sports" | "crafts" | "food" | "beverage";
      description: string;
      image_url: string;
      price_cents: number;
      currency: string;
      stock_qty: number;
      is_active: 0 | 1;
    }>
  ) {
    return updateShopProductAdmin(id, payload);
  }

  deleteShopProduct(id: number) {
    return deleteShopProductAdmin(id);
  }
}
