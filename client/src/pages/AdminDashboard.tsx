import { FormEvent, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

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

type TabKey = "notify" | "ntir" | "stories";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("notify");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifyRows, setNotifyRows] = useState<NotifyRow[]>([]);
  const [ntirRows, setNtirRows] = useState<NtirRow[]>([]);
  const [storyRows, setStoryRows] = useState<SuccessStoryRow[]>([]);
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

  const tabs = useMemo(
    () => [
      { key: "notify" as const, label: "Notify Me", count: notifyRows.length },
      { key: "ntir" as const, label: "NTIR", count: ntirRows.length },
      { key: "stories" as const, label: "Success Stories", count: storyRows.length },
    ],
    [notifyRows.length, ntirRows.length, storyRows.length]
  );

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const [notifyRes, ntirRes, storiesRes] = await Promise.all([
        api.get("/admin/notify-requests"),
        api.get("/admin/ntir"),
        api.get("/admin/success-stories"),
      ]);
      setNotifyRows(notifyRes.data?.rows ?? []);
      setNtirRows(ntirRes.data?.rows ?? []);
      setStoryRows(storiesRes.data?.stories ?? []);
    } catch (err: any) {
      const status = Number(err?.response?.status ?? 0);
      if (status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/admin")}`;
        return;
      }
      setError(String(err?.response?.data?.message ?? "Unable to load admin data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const submitNtir = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/admin/ntir", ntirForm);
      setNtirForm({ name: "", sector: "", location: "", verification_status: "Pending" });
      await loadAdminData();
    } catch (err: any) {
      setError(String(err?.response?.data?.message ?? "Unable to create NTIR entity."));
    }
  };

  const toggleNtirStatus = async (row: NtirRow) => {
    setError("");
    const nextStatus = row.verification_status === "Verified" ? "Pending" : "Verified";
    try {
      await api.put(`/admin/ntir/${row.id}`, { verification_status: nextStatus });
      await loadAdminData();
    } catch (err: any) {
      setError(String(err?.response?.data?.message ?? "Unable to update NTIR entity."));
    }
  };

  const submitStory = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/admin/success-stories", storyForm);
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
      setError(String(err?.response?.data?.message ?? "Unable to create success story."));
    }
  };

  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-6 py-28">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="text-white">
            <h1 className="text-4xl font-black tracking-tighter">Admin Dashboard</h1>
            <p className="text-white/75 mt-2">Manage notify requests, NTIR records, and success stories.</p>
          </div>

          {error ? <p className="text-red-400">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                onClick={() => setActiveTab(tab.key)}
                className={
                  activeTab === tab.key
                    ? "bg-zim-gold text-zim-black hover:bg-white"
                    : "border-white/20 bg-white/5 text-white hover:bg-white hover:text-zim-black"
                }
              >
                {tab.label} <Badge className="ml-2 bg-white/20 text-white border-transparent">{tab.count}</Badge>
              </Button>
            ))}
          </div>

          {loading ? <p className="text-white/75">Loading...</p> : null}

          {!loading && activeTab === "notify" ? (
            <div className="grid gap-4">
              {notifyRows.map((row) => (
                <div key={row.id} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{row.email}</p>
                      <p className="text-white/75 text-sm">{row.feature}</p>
                    </div>
                    <p className="text-xs text-white/50">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {notifyRows.length === 0 ? <p className="text-white/50">No notify requests yet.</p> : null}
            </div>
          ) : null}

          {!loading && activeTab === "ntir" ? (
            <div className="space-y-6">
              <form onSubmit={submitNtir} className="grid md:grid-cols-4 gap-3 rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                <Input
                  value={ntirForm.name}
                  onChange={(e) => setNtirForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Entity name"
                  className="bg-white/[0.05] border-white/20 text-white"
                />
                <Input
                  value={ntirForm.sector}
                  onChange={(e) => setNtirForm((prev) => ({ ...prev, sector: e.target.value }))}
                  placeholder="Sector"
                  className="bg-white/[0.05] border-white/20 text-white"
                />
                <Input
                  value={ntirForm.location}
                  onChange={(e) => setNtirForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Location"
                  className="bg-white/[0.05] border-white/20 text-white"
                />
                <Button type="submit" className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                  Add NTIR Row
                </Button>
              </form>

              <div className="grid gap-4">
                {ntirRows.map((row) => (
                  <div key={row.id} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 text-white">
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
                        {row.verification_status}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!loading && activeTab === "stories" ? (
            <div className="space-y-6">
              <form onSubmit={submitStory} className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    value={storyForm.title}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Title"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.category}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="Category"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.image}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="Image path or URL"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <Input
                    value={storyForm.author}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, author: e.target.value }))}
                    placeholder="Author"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.role}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder="Role"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.revenue}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, revenue: e.target.value }))}
                    placeholder="Revenue (e.g. $2.5M)"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    value={storyForm.jobs}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, jobs: e.target.value }))}
                    placeholder="Jobs (e.g. 150+)"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                  <Input
                    value={storyForm.markets}
                    onChange={(e) => setStoryForm((prev) => ({ ...prev, markets: e.target.value }))}
                    placeholder="Markets (e.g. EU, UK)"
                    className="bg-white/[0.05] border-white/20 text-white"
                  />
                </div>
                <Textarea
                  value={storyForm.story}
                  onChange={(e) => setStoryForm((prev) => ({ ...prev, story: e.target.value }))}
                  placeholder="Story content"
                  className="min-h-[120px] bg-white/[0.05] border-white/20 text-white"
                />
                <Textarea
                  value={storyForm.testimonial}
                  onChange={(e) => setStoryForm((prev) => ({ ...prev, testimonial: e.target.value }))}
                  placeholder="Testimonial"
                  className="min-h-[90px] bg-white/[0.05] border-white/20 text-white"
                />
                <Button type="submit" className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest">
                  Add Success Story
                </Button>
              </form>

              <div className="grid gap-4">
                {storyRows.map((story) => (
                  <div key={story.id} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{story.title}</p>
                        <p className="text-white/75 text-sm">
                          {story.category} - {story.author}
                        </p>
                      </div>
                      <Badge className={story.is_published ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}>
                        {story.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
