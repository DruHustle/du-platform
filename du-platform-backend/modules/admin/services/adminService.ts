import {
  ADMIN_SETTING_NOTIFY_ALERT_EMAILS,
  ADMIN_SETTING_NOTIFY_FROM_EMAIL,
  isValidEmail,
  notifyRestockSubscribersAndAdmins,
  parseCsvEmails,
} from "../../../shared/email";
import { AdminRepository } from "../repositories/adminRepository";

export class AdminServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

export class AdminService {
  constructor(private readonly repository = new AdminRepository()) {}

  async getOverview(user: { id: number; fullName: string; email: string }) {
    const [notifyRows, ntirRows, storyRows] = await Promise.all([
      this.repository.listFeatureNotifications(),
      this.repository.listNtirEntries(),
      this.repository.listImpactStories(),
    ]);

    return {
      ok: true,
      user,
      counts: {
        notifyRequests: notifyRows.length,
        ntirEntities: ntirRows.length,
        successStories: storyRows.length,
      },
    };
  }

  async getNotificationSettings() {
    const [alertEmailsRaw, fromEmailRaw] = await Promise.all([
      this.repository.getNotificationSetting(ADMIN_SETTING_NOTIFY_ALERT_EMAILS),
      this.repository.getNotificationSetting(ADMIN_SETTING_NOTIFY_FROM_EMAIL),
    ]);

    const alertEmails = parseCsvEmails(alertEmailsRaw);
    const fromEmail =
      fromEmailRaw && isValidEmail(fromEmailRaw)
        ? fromEmailRaw
        : String(process.env.FROM_EMAIL ?? "no-reply@du-platform.com").trim();

    return {
      alert_emails: alertEmails.join(", "),
      from_email: fromEmail,
    };
  }

  async updateNotificationSettings(input: { alert_emails?: string; from_email?: string }) {
    const alertEmails = String(input.alert_emails ?? "").trim();
    const fromEmail = String(input.from_email ?? "").trim();
    const parsedAlertEmails = parseCsvEmails(alertEmails);
    const hasInvalidAlertEmail =
      alertEmails.length > 0 &&
      parsedAlertEmails.length !==
        alertEmails
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean).length;

    if (hasInvalidAlertEmail) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "One or more alert emails are invalid.");
    }
    if (fromEmail.length > 0 && !isValidEmail(fromEmail)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "From email is invalid.");
    }

    const joinedEmails = parsedAlertEmails.join(", ");
    if (joinedEmails.length > 5000) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Email list exceeds maximum allowed length.");
    }

    await Promise.all([
      this.repository.upsertNotificationSetting(
        ADMIN_SETTING_NOTIFY_ALERT_EMAILS,
        joinedEmails
      ),
      this.repository.upsertNotificationSetting(ADMIN_SETTING_NOTIFY_FROM_EMAIL, fromEmail),
    ]);

    return {
      alert_emails: joinedEmails,
      from_email: fromEmail,
      ok: true,
    };
  }

  async listNotifyRequests() {
    const [featureRows, shopRows] = await Promise.all([
      this.repository.listFeatureNotifications(),
      this.repository.listShopRestockNotifications(),
    ]);

    const rows = [
      ...featureRows.map((row: any) => ({
        id: Number(row.id),
        email: String(row.email),
        feature: String(row.feature),
        created_at: row.created_at,
      })),
      ...shopRows.map((row: any) => ({
        id: Number(row.id) + 1_000_000,
        email: String(row.email),
        feature: `shop_restock_${String(row.product_slug ?? "")}`,
        created_at: row.created_at,
      })),
    ].sort((a, b) => {
      const aTs = new Date(a.created_at ?? 0).getTime();
      const bTs = new Date(b.created_at ?? 0).getTime();
      return bTs - aTs;
    });

    return { count: rows.length, rows };
  }

  async listNtirEntries() {
    const rows = await this.repository.listNtirEntries();
    return { count: rows.length, rows };
  }

  async createNtirEntry(input: {
    name?: string;
    sector?: string;
    location?: string;
    verification_status?: string;
  }) {
    const name = String(input.name ?? "").trim();
    const sector = String(input.sector ?? "").trim();
    const location = String(input.location ?? "").trim();
    const verificationStatus =
      String(input.verification_status ?? "Pending").trim() === "Verified" ? "Verified" : "Pending";

    if (!name || !sector || !location) {
      throw new AdminServiceError(
        "VALIDATION_FAILED",
        400,
        "Name, sector, and location are required."
      );
    }

    return {
      row: await this.repository.createNtirEntry(name, sector, location, verificationStatus),
    };
  }

  async updateNtirEntry(
    id: number,
    input: {
      name?: string;
      sector?: string;
      location?: string;
      verification_status?: string;
    }
  ) {
    if (!Number.isFinite(id)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Invalid entity id.");
    }

    const payload = {
      ...(input.name !== undefined ? { name: String(input.name).trim() } : {}),
      ...(input.sector !== undefined ? { sector: String(input.sector).trim() } : {}),
      ...(input.location !== undefined ? { location: String(input.location).trim() } : {}),
      ...(input.verification_status !== undefined
        ? {
            verification_status:
              String(input.verification_status).trim() === "Verified"
                ? ("Verified" as const)
                : ("Pending" as const),
          }
        : {}),
    };

    const row = await this.repository.updateNtirEntry(Math.floor(id), payload);
    if (!row) throw new AdminServiceError("NOT_FOUND", 404, "NTIR entity not found.");
    return { row };
  }

  async listImpactStories() {
    const stories = await this.repository.listImpactStories();
    return { count: stories.length, stories };
  }

  async createImpactStory(input: {
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
    is_published?: unknown;
  }) {
    const payload = {
      title: String(input.title ?? "").trim(),
      category: String(input.category ?? "").trim(),
      image: String(input.image ?? "").trim(),
      story: String(input.story ?? "").trim(),
      testimonial: String(input.testimonial ?? "").trim(),
      author: String(input.author ?? "").trim(),
      role: String(input.role ?? "").trim(),
      revenue: String(input.revenue ?? "").trim(),
      jobs: String(input.jobs ?? "").trim(),
      markets: String(input.markets ?? "").trim(),
      is_published: input.is_published === false ? (0 as const) : (1 as const),
    };

    if (!payload.title || !payload.category || !payload.story || !payload.author) {
      throw new AdminServiceError(
        "VALIDATION_FAILED",
        400,
        "Title, category, story, and author are required."
      );
    }

    return { story: await this.repository.createImpactStory(payload) };
  }

  async updateImpactStory(
    id: number,
    input: {
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
      is_published?: unknown;
    }
  ) {
    if (!Number.isFinite(id)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Invalid story id.");
    }

    const payload: {
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
    } = {};

    if (input.title !== undefined) payload.title = String(input.title).trim();
    if (input.category !== undefined) payload.category = String(input.category).trim();
    if (input.image !== undefined) payload.image = String(input.image).trim();
    if (input.story !== undefined) payload.story = String(input.story).trim();
    if (input.testimonial !== undefined) payload.testimonial = String(input.testimonial).trim();
    if (input.author !== undefined) payload.author = String(input.author).trim();
    if (input.role !== undefined) payload.role = String(input.role).trim();
    if (input.revenue !== undefined) payload.revenue = String(input.revenue).trim();
    if (input.jobs !== undefined) payload.jobs = String(input.jobs).trim();
    if (input.markets !== undefined) payload.markets = String(input.markets).trim();
    if (input.is_published !== undefined) {
      payload.is_published = input.is_published === 0 || input.is_published === false ? 0 : 1;
    }

    const story = await this.repository.updateImpactStory(Math.floor(id), payload);
    if (!story) throw new AdminServiceError("NOT_FOUND", 404, "Impact story not found.");
    return { story };
  }

  async listShopProducts() {
    const rows = await this.repository.listShopProducts();
    return { count: rows.length, rows };
  }

  async createShopProduct(input: {
    slug?: string;
    name?: string;
    category?: string;
    description?: string;
    image_url?: string;
    price_cents?: number;
    currency?: string;
    stock_qty?: number;
    is_active?: unknown;
  }) {
    const slug = String(input.slug ?? "").trim();
    const name = String(input.name ?? "").trim();
    const category = String(input.category ?? "").trim().toLowerCase();
    const description = String(input.description ?? "").trim();
    const image_url = String(input.image_url ?? "").trim();
    const price_cents = Number(input.price_cents ?? 0);
    const currency = String(input.currency ?? "EUR").trim().toUpperCase();
    const stock_qty = Math.max(0, Math.floor(Number(input.stock_qty ?? 0)));
    const is_active = input.is_active === 0 || input.is_active === false ? (0 as const) : (1 as const);

    if (!slug || !name || !description || !image_url) {
      throw new AdminServiceError(
        "VALIDATION_FAILED",
        400,
        "Slug, name, description and image are required."
      );
    }
    if (!["sports", "crafts", "food"].includes(category)) {
      throw new AdminServiceError(
        "VALIDATION_FAILED",
        400,
        "Category must be sports, crafts, or food."
      );
    }
    if (!Number.isFinite(price_cents) || price_cents <= 0) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Price must be greater than zero.");
    }

    return {
      row: await this.repository.createShopProduct({
        slug,
        name,
        category: category as "sports" | "crafts" | "food",
        description,
        image_url,
        price_cents: Math.floor(price_cents),
        currency: currency || "EUR",
        stock_qty,
        is_active,
      }),
    };
  }

  async updateShopProduct(
    id: number,
    input: {
      slug?: string;
      name?: string;
      category?: string;
      description?: string;
      image_url?: string;
      price_cents?: number;
      currency?: string;
      stock_qty?: number;
      is_active?: unknown;
    },
    updatedByEmail: string
  ) {
    if (!Number.isFinite(id)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Invalid product id.");
    }

    const rawCategory =
      input.category !== undefined ? String(input.category).trim().toLowerCase() : undefined;
    if (rawCategory !== undefined && !["sports", "crafts", "food"].includes(rawCategory)) {
      throw new AdminServiceError(
        "VALIDATION_FAILED",
        400,
        "Category must be sports, crafts, or food."
      );
    }

    const rawPrice = input.price_cents !== undefined ? Number(input.price_cents) : undefined;
    if (rawPrice !== undefined && (!Number.isFinite(rawPrice) || rawPrice <= 0)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Price must be greater than zero.");
    }

    const rawStock = input.stock_qty !== undefined ? Number(input.stock_qty) : undefined;
    if (rawStock !== undefined && (!Number.isFinite(rawStock) || rawStock < 0)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Stock must be zero or greater.");
    }

    const payload: Partial<{
      slug: string;
      name: string;
      category: "sports" | "crafts" | "food";
      description: string;
      image_url: string;
      price_cents: number;
      currency: string;
      stock_qty: number;
      is_active: 0 | 1;
    }> = {};

    if (input.slug !== undefined) payload.slug = String(input.slug).trim();
    if (input.name !== undefined) payload.name = String(input.name).trim();
    if (input.description !== undefined) payload.description = String(input.description).trim();
    if (input.image_url !== undefined) payload.image_url = String(input.image_url).trim();
    if (rawCategory !== undefined) payload.category = rawCategory as "sports" | "crafts" | "food";
    if (rawPrice !== undefined) payload.price_cents = Math.floor(rawPrice);
    if (input.currency !== undefined) payload.currency = String(input.currency).trim().toUpperCase();
    if (rawStock !== undefined) payload.stock_qty = Math.floor(rawStock);
    if (input.is_active !== undefined) {
      payload.is_active = input.is_active === 0 || input.is_active === false ? 0 : 1;
    }

    const beforeRow = await this.repository.getShopProductById(Math.floor(id));
    const row = await this.repository.updateShopProduct(Math.floor(id), payload);
    if (!row) throw new AdminServiceError("NOT_FOUND", 404, "Product not found.");

    const prevStock = Number((beforeRow as any)?.stock_qty ?? 0);
    const nextStock = Number((row as any)?.stock_qty ?? 0);
    if (prevStock <= 0 && nextStock > 0) {
      await notifyRestockSubscribersAndAdmins({
        productId: Number((row as any)?.id ?? id),
        productName: String((row as any)?.name ?? ""),
        productSlug: String((row as any)?.slug ?? ""),
        stockQty: Math.max(0, Math.floor(nextStock)),
        updatedByEmail: String(updatedByEmail ?? ""),
      });
    }

    return { row };
  }

  async deleteShopProduct(id: number) {
    if (!Number.isFinite(id)) {
      throw new AdminServiceError("VALIDATION_FAILED", 400, "Invalid product id.");
    }

    const deleted = await this.repository.deleteShopProduct(Math.floor(id));
    if (!deleted) throw new AdminServiceError("NOT_FOUND", 404, "Product not found.");
    return { ok: true };
  }
}
