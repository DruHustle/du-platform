import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type NotifyRow = {
  id: number;
  email: string;
  feature: string;
  created_at: string;
};

type NtirRow = {
  id: number;
  name: string;
  sector: string;
  location: string;
  verification_status: "Verified" | "Pending";
};

type SuccessStoryRow = {
  id: number;
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
  created_at: string;
};

type ShopProductRow = {
  id: number;
  slug: string;
  name: string;
  category: "sports" | "crafts" | "food";
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
  is_active: 0 | 1;
};

type TabKey = "notify" | "ntir" | "stories" | "shop";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const tr = (key: string, fallback: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue: fallback, ...options });
  const [activeTab, setActiveTab] = useState<TabKey>("notify");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifyRows, setNotifyRows] = useState<NotifyRow[]>([]);
  const [newNotifyCount, setNewNotifyCount] = useState(0);
  const [ntirRows, setNtirRows] = useState<NtirRow[]>([]);
  const [storyRows, setStoryRows] = useState<SuccessStoryRow[]>([]);
  const [shopRows, setShopRows] = useState<ShopProductRow[]>([]);
  const [notificationSettingsForm, setNotificationSettingsForm] = useState({
    alert_emails: "",
    from_email: "",
  });
  const [ntirForm, setNtirForm] = useState({ name: "", sector: "", location: "", verification_status: "Pending" });
  const [storyForm, setStoryForm] = useState({
    title: "",
    category: "",
    image: "",
    story: "",
    testimonial: "",
    author: "",
    role: "",
    revenue: "",
    jobs: "",
    markets: "",
    is_published: true,
  });
  const [shopForm, setShopForm] = useState({
    slug: "",
    name: "",
    category: "sports" as "sports" | "crafts" | "food",
    description: "",
    image_url: "",
    price_cents: "0",
    currency: "EUR",
    stock_qty: "0",
    is_active: true,
  });
  const [editingShopId, setEditingShopId] = useState<number | null>(null);
  const notifyIdsRef = useRef<Set<number>>(new Set());

  const tabs = useMemo(
    () => [
      {
        key: "notify" as const,
        label: tr("admin.tabs.notify", "Notify Me"),
        count: notifyRows.length,
        newCount: newNotifyCount,
      },
      { key: "ntir" as const, label: tr("admin.tabs.ntir", "NTIR"), count: ntirRows.length },
      { key: "stories" as const, label: tr("admin.tabs.stories", "Impact"), count: storyRows.length },
      { key: "shop" as const, label: tr("admin.tabs.shop", "Shop Products"), count: shopRows.length },
    ],
    [newNotifyCount, notifyRows.length, ntirRows.length, storyRows.length, shopRows.length, t]
  );

  const loadAdminData = async ({ silent = false, detectNewNotify = false }: { silent?: boolean; detectNewNotify?: boolean } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      if (detectNewNotify) {
        const notifyRes = await api.get("/admin/notify-requests");
        const nextNotifyRows: NotifyRow[] = notifyRes.data?.rows ?? [];
        let freshCount = 0;
        for (const row of nextNotifyRows) {
          if (!notifyIdsRef.current.has(Number(row.id))) freshCount += 1;
        }
        if (freshCount > 0) {
          setNewNotifyCount((prev) => prev + freshCount);
          toast.success(
            freshCount === 1
              ? tr("admin.notify.new_received_single", "1 new notify request received.")
              : tr("admin.notify.new_received_multi", "{{count}} new notify requests received.", { count: freshCount })
          );
        }
        notifyIdsRef.current = new Set(nextNotifyRows.map((row) => Number(row.id)));
        setNotifyRows(nextNotifyRows);
        return;
      }

      const [notifyRes, ntirRes, storiesRes, shopRes, settingsRes] = await Promise.all([
        api.get("/admin/notify-requests"),
        api.get("/admin/ntir"),
        api.get("/admin/impact"),
        api.get("/admin/shop-products"),
        api.get("/admin/notification-settings"),
      ]);
      const nextNotifyRows: NotifyRow[] = notifyRes.data?.rows ?? [];
      notifyIdsRef.current = new Set(nextNotifyRows.map((row) => Number(row.id)));
      setNotifyRows(nextNotifyRows);
      setNtirRows(ntirRes.data?.rows ?? []);
      setStoryRows(storiesRes.data?.stories ?? []);
      setShopRows(shopRes.data?.rows ?? []);
      setNotificationSettingsForm({
        alert_emails: String(settingsRes.data?.alert_emails ?? ""),
        from_email: String(settingsRes.data?.from_email ?? ""),
      });
    } catch (err: any) {
      const status = Number(err?.response?.status ?? 0);
      if (status === 401) {
        setLocation(`/login?next=${encodeURIComponent("/admin")}`, { replace: true });
        return;
      }
      setError(getApiErrorMessage(err, tr("admin.errors.load", "Unable to load admin data.")));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const resetShopForm = () => {
    setShopForm({
      slug: "",
      name: "",
      category: "sports",
      description: "",
      image_url: "",
      price_cents: "0",
      currency: "EUR",
      stock_qty: "0",
      is_active: true,
    });
    setEditingShopId(null);
  };

  const submitShopProduct = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = {
      ...shopForm,
      price_cents: Math.floor(Number(shopForm.price_cents)),
      stock_qty: Math.floor(Number(shopForm.stock_qty)),
      is_active: shopForm.is_active ? 1 : 0,
    };
    try {
      if (editingShopId) {
        await api.put(`/admin/shop-products/${editingShopId}`, payload);
      } else {
        await api.post("/admin/shop-products", payload);
      }
      resetShopForm();
      await loadAdminData();
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.save_shop", "Unable to save shop product.")));
    }
  };

  const editShopProduct = (row: ShopProductRow) => {
    setEditingShopId(row.id);
    setShopForm({
      slug: row.slug,
      name: row.name,
      category: row.category,
      description: row.description,
      image_url: row.image_url,
      price_cents: String(row.price_cents),
      currency: row.currency || "EUR",
      stock_qty: String(row.stock_qty),
      is_active: row.is_active === 1,
    });
    setActiveTab("shop");
  };

  const deleteShopProduct = async (id: number) => {
    setError("");
    try {
      await api.delete(`/admin/shop-products/${id}`);
      if (editingShopId === id) resetShopForm();
      await loadAdminData();
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.delete_shop", "Unable to delete shop product.")));
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadAdminData({ silent: true, detectNewNotify: true });
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const submitNtir = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/admin/ntir", ntirForm);
      setNtirForm({ name: "", sector: "", location: "", verification_status: "Pending" });
      await loadAdminData();
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.create_ntir", "Unable to create NTIR entity.")));
    }
  };

  const toggleNtirStatus = async (row: NtirRow) => {
    setError("");
    const nextStatus = row.verification_status === "Verified" ? "Pending" : "Verified";
    try {
      await api.put(`/admin/ntir/${row.id}`, { verification_status: nextStatus });
      await loadAdminData();
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.update_ntir", "Unable to update NTIR entity.")));
    }
  };

  const submitStory = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/admin/impact", storyForm);
      setStoryForm({
        title: "",
        category: "",
        image: "",
        story: "",
        testimonial: "",
        author: "",
        role: "",
        revenue: "",
        jobs: "",
        markets: "",
        is_published: true,
      });
      await loadAdminData();
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.create_story", "Unable to create impact story.")));
    }
  };

  const toggleStoryDisplay = async (row: SuccessStoryRow) => {
    setError("");
    try {
      const nextDisplay = row.is_published === 1 ? 0 : 1;
      await api.put(`/admin/impact/${row.id}`, { is_published: nextDisplay });
      await loadAdminData({ silent: true });
      toast.success(
        nextDisplay === 1
          ? tr("admin.stories.toast_display", "Story set to Display.")
          : tr("admin.stories.toast_hide", "Story set to Don't display.")
      );
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.update_story", "Unable to update story visibility.")));
    }
  };

  const saveNotificationSettings = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        alert_emails: String(notificationSettingsForm.alert_emails ?? "").trim(),
        from_email: String(notificationSettingsForm.from_email ?? "").trim(),
      };
      await api.put("/admin/notification-settings", payload);
      toast.success(tr("admin.notify.settings_saved", "Notification email settings saved."));
      await loadAdminData({ silent: true });
    } catch (err: any) {
      setError(getApiErrorMessage(err, tr("admin.errors.save_notification_settings", "Unable to save notification settings.")));
    }
  };

  const formatNotifyFeature = (feature: string) => {
    const value = String(feature ?? "");
    if (value.startsWith("shop_restock_")) {
      const slug = value.slice("shop_restock_".length).replaceAll("_", " ").trim();
      return slug
        ? tr("admin.notify.feature_restock", "Shop restock: {{slug}}", { slug })
        : tr("admin.notify.feature_restock_fallback", "Shop restock request");
    }
    return value;
  };

  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="text-white">
            <h1 className="page-title">
              {tr("admin.title", "Admin Dashboard")}
            </h1>
            <p className="text-white/75 mt-2">
              {tr(
                "admin.subtitle",
                "Manage notifications, visibility (display / don't display), and pricing."
              )}
            </p>
          </div>

          {error ? <p className="text-red-400">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                className={
                  activeTab === tab.key
                    ? "bg-zim-gold text-zim-black hover:bg-white"
                    : "border-white/20 bg-white/5 text-white hover:bg-white hover:text-zim-black"
                }
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "notify") setNewNotifyCount(0);
                }}
              >
                {tab.label} <Badge className="ml-2 bg-white/20 text-white border-transparent">{tab.count}</Badge>
                {"newCount" in tab && tab.newCount ? (
                  <Badge className="ml-2 bg-zim-gold text-zim-black border-transparent">
                    {tab.newCount} {tr("admin.badges.new", "new")}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>

          {newNotifyCount > 0 && activeTab !== "notify" ? (
            <div className="rounded-xl border border-zim-gold/30 bg-zim-gold/10 p-4 text-sm text-zim-gold">
              {newNotifyCount === 1
                ? tr("admin.notify.new_request_single", "1 new notify request in Admin > Notify Me.")
                : tr("admin.notify.new_request_multi", "{{count}} new notify requests in Admin > Notify Me.", {
                    count: newNotifyCount,
                  })}
            </div>
          ) : null}

          {loading ? <p className="text-white/75">{t("common.loading", { defaultValue: "Loading..." })}</p> : null}

          {!loading && activeTab === "notify" ? (
            <div className="grid gap-4">
              <form
                onSubmit={saveNotificationSettings}
                className="surface-card p-7 space-y-3"
              >
                <p className="text-white font-black">
                  {tr("admin.notify.settings_title", "Notification Email Settings")}
                </p>
                <p className="text-white/70 text-sm">
                  {tr(
                    "admin.notify.settings_description",
                    "Configure where `Notify Me` alerts are sent and the sender email used for outgoing notifications."
                  )}
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={notificationSettingsForm.alert_emails}
                    onChange={(e) =>
                      setNotificationSettingsForm((prev) => ({ ...prev, alert_emails: e.target.value }))
                    }
                    placeholder={tr("admin.notify.alert_emails_placeholder", "Alert emails (comma-separated)")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={notificationSettingsForm.from_email}
                    onChange={(e) =>
                      setNotificationSettingsForm((prev) => ({ ...prev, from_email: e.target.value }))
                    }
                    placeholder={tr("admin.notify.from_email_placeholder", "From email")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest"
                >
                  {tr("admin.notify.save_settings", "Save Email Settings")}
                </Button>
              </form>

              {notifyRows.map((row) => (
                <div key={row.id} className="surface-card p-7 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{row.email}</p>
                      <p className="text-white/75 text-sm">{formatNotifyFeature(row.feature)}</p>
                    </div>
                    <p className="text-xs text-white/70">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {notifyRows.length === 0 ? (
                <p className="text-white/70">{tr("admin.notify.empty", "No notify requests yet.")}</p>
              ) : null}
            </div>
          ) : null}

          {!loading && activeTab === "ntir" ? (
            <div className="space-y-6">
              <form onSubmit={submitNtir} className="grid md:grid-cols-4 gap-3 surface-card p-7">
                <Input
                  value={ntirForm.name}
                  onChange={(e) => setNtirForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={tr("admin.ntir.entity_placeholder", "Entity name")}
                  className="bg-white/[0.05] border-white/20 text-white"
                />
                <Input
                  value={ntirForm.sector}
                  onChange={(e) => setNtirForm((prev) => ({ ...prev, sector: e.target.value }))}
                  placeholder={tr("admin.ntir.sector_placeholder", "Sector")}
                  className="bg-white/[0.05] border-white/20 text-white"
                />
                <Input
                  value={ntirForm.location}
                  onChange={(e) => setNtirForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder={tr("admin.ntir.location_placeholder", "Location")}
                  className="bg-white/[0.05] border-white/20 text-white"
                />
                <Button type="submit" className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                  {tr("admin.ntir.add_row", "Add NTIR Row")}
                </Button>
              </form>

              <div className="grid gap-4">
                {ntirRows.map((row) => (
                  <div key={row.id} className="surface-card p-7 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{row.name}</p>
                        <p className="text-white/75 text-sm">
                          {row.sector} - {row.location}
                        </p>
                      </div>
                      <Button
                        onClick={() => toggleNtirStatus(row)}
                        variant="outline"
                        className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-zim-black"
                      >
                        {row.verification_status === "Verified"
                          ? t("common.verified", { defaultValue: "Verified" })
                          : t("common.pending", { defaultValue: "Pending" })}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && activeTab === "stories" ? (
            <div className="space-y-6">
              <form onSubmit={submitStory} className="space-y-3 surface-card p-7">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    value={storyForm.title}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={tr("admin.stories.title_placeholder", "Title")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.category}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder={tr("admin.stories.category_placeholder", "Category")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.image}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder={tr("admin.stories.image_placeholder", "Image path or URL")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    value={storyForm.author}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, author: e.target.value }))}
                    placeholder={tr("admin.stories.author_placeholder", "Author")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.role}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder={tr("admin.stories.role_placeholder", "Role")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.revenue}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, revenue: e.target.value }))}
                    placeholder={tr("admin.stories.revenue_placeholder", "Revenue (e.g. $2.5M)")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={storyForm.jobs}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, jobs: e.target.value }))}
                    placeholder={tr("admin.stories.jobs_placeholder", "Jobs (e.g. 150+)")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.markets}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, markets: e.target.value }))}
                    placeholder={tr("admin.stories.markets_placeholder", "Markets (e.g. EU, UK)")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <Textarea
                  value={storyForm.story}
                  onChange={(e) => setStoryForm((prev) => ({ ...prev, story: e.target.value }))}
                  placeholder={tr("admin.stories.story_placeholder", "Story content")}
                  className="min-h-[120px] bg-white/[0.05] border-white/20 text-white"
                />
                <Textarea
                  value={storyForm.testimonial}
                  onChange={(e) => setStoryForm((prev) => ({ ...prev, testimonial: e.target.value }))}
                  placeholder={tr("admin.stories.testimonial_placeholder", "Testimonial")}
                  className="min-h-[90px] bg-white/[0.05] border-white/20 text-white"
                />
                <label className="text-white/80 text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={storyForm.is_published}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                  />
                  {tr("admin.stories.display_label", "Display on impact page")}
                </label>
                <Button type="submit" className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                  {tr("admin.stories.add_story", "Add Impact Story")}
                </Button>
              </form>

              <div className="grid gap-4">
                {storyRows.map((story) => (
                  <div key={story.id} className="surface-card p-7 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{story.title}</p>
                        <p className="text-white/75 text-sm">
                          {story.category} - {story.author}
                        </p>
                      </div>
                      <Badge className={story.is_published ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}>
                        {story.is_published
                          ? tr("admin.stories.badge_display", "Display")
                          : tr("admin.stories.badge_hide", "Don't display")}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleStoryDisplay(story)}
                        className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-zim-black"
                      >
                        {story.is_published
                          ? tr("admin.stories.set_hide", "Set Don't display")
                          : tr("admin.stories.set_display", "Set Display")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && activeTab === "shop" ? (
            <div className="space-y-6">
              <form onSubmit={submitShopProduct} className="space-y-3 surface-card p-7">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    value={shopForm.slug}
                    onChange={(e) => setShopForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder={tr("admin.shop.slug_placeholder", "Slug")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={shopForm.name}
                    onChange={(e) => setShopForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={tr("admin.shop.name_placeholder", "Product name")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={shopForm.image_url}
                    onChange={(e) => setShopForm((p) => ({ ...p, image_url: e.target.value }))}
                    placeholder={tr("admin.shop.image_placeholder", "Image URL or path")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  <Input
                    value={shopForm.category}
                    onChange={(e) =>
                      setShopForm((p) => ({ ...p, category: e.target.value as "sports" | "crafts" | "food" }))
                    }
                    placeholder={tr("admin.shop.category_placeholder", "Category: sports/crafts/food")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={shopForm.price_cents}
                    onChange={(e) => setShopForm((p) => ({ ...p, price_cents: e.target.value }))}
                    placeholder={tr("admin.shop.price_placeholder", "Price cents (e.g. 4999)")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={shopForm.stock_qty}
                    onChange={(e) => setShopForm((p) => ({ ...p, stock_qty: e.target.value }))}
                    placeholder={tr("admin.shop.stock_placeholder", "Stock qty")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={shopForm.currency}
                    onChange={(e) => setShopForm((p) => ({ ...p, currency: e.target.value }))}
                    placeholder={tr("admin.shop.currency_placeholder", "Currency")}
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <Textarea
                  value={shopForm.description}
                  onChange={(e) => setShopForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={tr("admin.shop.description_placeholder", "Description")}
                  className="min-h-[90px] bg-white/[0.05] border-white/20 text-white"
                />
                <div className="flex items-center gap-4">
                  <label className="text-white/80 text-sm flex items-center gap-2">
                    <input type="checkbox" checked={shopForm.is_active} onChange={(e) => setShopForm((p) => ({ ...p, is_active: e.target.checked }))} />
                    {tr("admin.shop.display_label", "Display product")}
                  </label>
                  <Button type="submit" className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                    {editingShopId
                      ? tr("admin.shop.update_product", "Update Product")
                      : tr("admin.shop.add_product", "Add Product")}
                  </Button>
                  {editingShopId ? (
                    <Button type="button" variant="outline" onClick={resetShopForm} className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-zim-black">
                      {tr("admin.shop.cancel_edit", "Cancel Edit")}
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="grid gap-4">
                {shopRows.map((row) => (
                  <div key={row.id} className="surface-card p-7 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{row.name}</p>
                        <p className="text-white/75 text-sm">
                          {row.category} | {row.slug} | {row.currency} {(Number(row.price_cents) / 100).toFixed(2)} |{" "}
                          {tr("admin.shop.stock_label", "Stock")} {row.stock_qty}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={row.is_active ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}>
                          {row.is_active
                            ? tr("admin.shop.badge_display", "Display")
                            : tr("admin.shop.badge_hide", "Don't display")}
                        </Badge>
                        <Button type="button" variant="outline" onClick={() => editShopProduct(row)} className="border-white/20 bg-white/5 text-white hover:bg-white hover:text-zim-black">
                          {tr("admin.shop.edit", "Edit")}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => deleteShopProduct(row.id)} className="border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500 hover:text-white">
                          {tr("admin.shop.delete", "Delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {shopRows.length === 0 ? (
                  <p className="text-white/70">{tr("admin.shop.empty", "No shop products yet.")}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
