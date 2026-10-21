import { useEffect, useState, type FormEvent } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Subscriber = {
  id: number;
  email: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};
type Campaign = {
  id: number;
  subject: string;
  body: string;
  version: number;
  status: string;
  recipients: number;
  accepted: number;
  failed: number;
  skipped: number;
  remaining: number;
};
type Delivery = {
  id: number;
  recipient: string;
  kind: string;
  status: string;
  attempts: number;
  error_message: string | null;
  retry_safe: number;
  created_at: string;
};
const primary = "bg-zim-gold text-slate-950 hover:bg-yellow-300";
const secondary = "border-white/20 bg-white/5 text-white hover:bg-white/10";
const panel = "rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-7";
const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export default function NewsletterAdmin({
  onDirtyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [view, setView] = useState<"subscribers" | "compose" | "activity">(
    "subscribers"
  );
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const [sender, setSender] = useState({ ready: false, from: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [saved, setSaved] = useState<Campaign | null>(null);
  const [confirmation, setConfirmation] = useState<"send" | Subscriber | null>(
    null
  );
  const dirty =
    !saved ||
    saved.subject !== draft.subject.trim() ||
    saved.body !== draft.body.trim();
  const subscribed = counts.subscribed || 0;
  const unsaved = dirty && Boolean(saved || draft.subject || draft.body);
  useEffect(() => {
    onDirtyChange(unsaved);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (unsaved) window.addEventListener("beforeunload", beforeUnload);
    return () => {
      onDirtyChange(false);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [unsaved, onDirtyChange]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/admin/newsletter/subscribers", {
        params: { page, search, status: filter },
        signal: abort.signal,
      }),
      api.get("/admin/newsletter/campaigns", { signal: abort.signal }),
      api.get("/admin/newsletter/deliveries", {
        params: { page: deliveryPage },
        signal: abort.signal,
      }),
    ])
      .then(([subscribers, campaignData, activity]) => {
        setRows(subscribers.data.rows);
        setCounts(subscribers.data.counts);
        setTotal(subscribers.data.total);
        setSender(subscribers.data.sender);
        setCampaigns(campaignData.data.rows);
        setDeliveries(activity.data.rows);
        setDeliveryTotal(activity.data.total);
      })
      .catch(err => {
        if (!abort.signal.aborted)
          setError(
            getApiErrorMessage(
              err,
              "Unable to load the newsletter workspace. Please retry."
            )
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [page, search, filter, revision, deliveryPage]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && view === "activity")
        setRevision(value => value + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [view]);

  const action = async (run: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage(await run());
      setRevision(value => value + 1);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Unable to complete this action. Please try again."
        )
      );
    } finally {
      setBusy(false);
    }
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    void action(async () => {
      const payload = {
        subject: draft.subject.trim(),
        body: draft.body.trim(),
        version: saved?.version,
      };
      const result = saved
        ? await api.put(`/admin/newsletter/campaigns/${saved.id}`, payload)
        : await api.post("/admin/newsletter/campaigns", payload);
      const data = await api.get("/admin/newsletter/campaigns");
      const next = data.data.rows.find(
        (row: Campaign) => row.id === result.data.id
      );
      setSaved(next);
      setDraft({ subject: next.subject, body: next.body });
      return "Draft saved in the database.";
    });
  };
  const confirm = () =>
    void action(async () => {
      if (confirmation === "send" && saved) {
        const result = await api.post(
          `/admin/newsletter/campaigns/${saved.id}/send`,
          { version: saved.version, confirm: true }
        );
        setConfirmation(null);
        setSaved(null);
        setDraft({ subject: "", body: "" });
        setView("activity");
        return result.data.message;
      }
      if (confirmation && confirmation !== "send") {
        await api.post(
          `/admin/newsletter/subscribers/${confirmation.id}/unsubscribe`
        );
        setConfirmation(null);
        return "Subscriber opted out. Pending messages will be skipped.";
      }
      return "";
    });
  return (
    <div className="space-y-6 text-white" aria-label="Newsletter workspace">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Newsletter</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Build your audience and share news from Diaspora Unlocked. Signups,
            drafts and individual delivery results are saved in the database.
          </p>
        </div>
        <Button
          variant="outline"
          className={secondary}
          disabled={loading || busy}
          onClick={() => setRevision(value => value + 1)}
        >
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Subscribed", counts.subscribed || 0],
          ["Awaiting confirmation", counts.pending || 0],
          ["Unsubscribed", counts.unsubscribed || 0],
        ].map(([label, count]) => (
          <div
            className="rounded-xl border border-white/10 bg-slate-900 p-3 sm:p-5"
            key={label}
          >
            <p className="text-2xl font-semibold text-zim-gold">{count}</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">{label}</p>
          </div>
        ))}
      </div>
      {!loading && !sender.ready && (
        <p
          role="status"
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
        >
          Email delivery needs configuration. Subscribers and drafts remain
          saved; sending is unavailable until the provider and sender are ready.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}
      <nav aria-label="Newsletter sections" className="flex flex-wrap gap-2">
        {(
          [
            ["subscribers", "Subscribers"],
            ["compose", "Compose & campaigns"],
            ["activity", "Delivery activity"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            aria-pressed={view === key}
            className={view === key ? primary : secondary}
            onClick={() => setView(key)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {loading && (
        <p role="status" className="text-sm text-slate-300">
          Loading newsletter data…
        </p>
      )}
      {view === "subscribers" && (
        <section className={panel}>
          <h3 className="text-lg font-semibold">Subscriber list</h3>
          <form
            className="my-5 flex flex-wrap items-end gap-3"
            onSubmit={event => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <label className="min-w-0 flex-1 text-sm">
              Search email
              <Input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Find a subscriber"
                className="mt-2"
                maxLength={255}
              />
            </label>
            <label className="text-sm">
              Status
              <select
                className="mt-2 block h-11 max-w-full rounded-md border border-white/20 bg-slate-950 px-3"
                value={filter}
                onChange={event => {
                  setFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All subscribers</option>
                <option value="subscribed">Subscribed</option>
                <option value="pending">Awaiting confirmation</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
            </label>
            <Button type="submit" className={primary}>
              Search
            </Button>
          </form>
          <p className="mb-4 text-xs text-slate-400">
            Only subscribed addresses receive campaigns. Existing signups are
            preserved; new signups must confirm their email.
          </p>
          {!loading && !rows.length ? (
            <p className="py-8 text-slate-300">
              {search || filter !== "all"
                ? "No subscribers match these filters."
                : "No signups yet. Subscribers will appear here after using the site’s signup form."}
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {rows.map(row => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                  key={row.id}
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium">{row.email}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {row.status === "pending"
                        ? "Awaiting confirmation"
                        : row.status}{" "}
                      · Signed up {date(row.created_at)}
                    </p>
                  </div>
                  {row.status !== "unsubscribed" && (
                    <Button
                      variant="outline"
                      className={secondary}
                      disabled={busy}
                      onClick={() => setConfirmation(row)}
                    >
                      Unsubscribe
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {total} matching subscribers · Page {page} of{" "}
              {Math.max(1, Math.ceil(total / 25))}
            </span>
            <div className="flex gap-2">
              <Button
                className={secondary}
                disabled={page <= 1 || loading}
                onClick={() => setPage(value => value - 1)}
              >
                Previous
              </Button>
              <Button
                className={secondary}
                disabled={page * 25 >= total || loading}
                onClick={() => setPage(value => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      )}
      {view === "compose" && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <form onSubmit={save} className={`${panel} space-y-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  {saved ? `Edit draft #${saved.id}` : "New newsletter"}
                </h3>
                {saved && (
                  <Button
                    type="button"
                    className={secondary}
                    disabled={busy}
                    onClick={() => {
                      if (
                        dirty &&
                        !window.confirm(
                          "Discard your unsaved changes and start a new draft?"
                        )
                      )
                        return;
                      setSaved(null);
                      setDraft({ subject: "", body: "" });
                    }}
                  >
                    New draft
                  </Button>
                )}
              </div>
              <label className="block text-sm">
                Subject
                <Input
                  required
                  maxLength={160}
                  value={draft.subject}
                  disabled={busy}
                  onChange={event =>
                    setDraft(value => ({
                      ...value,
                      subject: event.target.value,
                    }))
                  }
                  className="mt-2"
                  placeholder="What’s new at Diaspora Unlocked?"
                />
              </label>
              <label className="block text-sm">
                Message
                <Textarea
                  required
                  maxLength={20000}
                  value={draft.body}
                  disabled={busy}
                  onChange={event =>
                    setDraft(value => ({ ...value, body: event.target.value }))
                  }
                  className="mt-2 min-h-64"
                  placeholder="Write your newsletter here…"
                />
              </label>
              <p className="text-xs leading-5 text-slate-400">
                Plain text is formatted safely for email. A personal unsubscribe
                link is included automatically. Save before testing or sending.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className={primary} disabled={busy || !dirty}>
                  {busy ? "Working…" : "Save draft"}
                </Button>
                <Button
                  type="button"
                  className={secondary}
                  disabled={busy || dirty || !sender.ready}
                  onClick={() =>
                    void action(
                      async () =>
                        (
                          await api.post(
                            `/admin/newsletter/campaigns/${saved!.id}/test`,
                            { version: saved!.version }
                          )
                        ).data.message
                    )
                  }
                >
                  Send test to me
                </Button>
                <Button
                  type="button"
                  className={primary}
                  disabled={busy || dirty || !sender.ready || !subscribed}
                  onClick={() => setConfirmation("send")}
                >
                  Review & send
                </Button>
              </div>
            </form>
            <section className={`${panel} min-w-0`} aria-label="Email preview">
              <h3 className="text-lg font-semibold">Email preview</h3>
              <p className="mt-2 text-xs text-slate-400">
                From {sender.from || "your configured sender"}
              </p>
              <div className="mt-5 rounded-xl bg-white p-5 text-slate-900">
                <p className="text-xs tracking-widest text-amber-800">
                  DIASPORA UNLOCKED
                </p>
                <h4 className="my-5 break-words text-2xl font-semibold">
                  {draft.subject || "Your newsletter subject"}
                </h4>
                <div className="whitespace-pre-wrap break-words text-sm leading-7">
                  {draft.body || "Your message will appear here."}
                </div>
                <hr className="my-6 border-slate-200" />
                <p className="text-xs leading-5 text-slate-500">
                  You subscribed to Diaspora Unlocked. Unsubscribe at any time.
                </p>
              </div>
            </section>
          </div>
          <section className={panel}>
            <h3 className="text-lg font-semibold">Saved campaigns</h3>
            <p className="mt-2 text-xs text-slate-400">
              Latest 100 campaigns. Accepted means the email provider accepted
              the message; it does not confirm inbox delivery.
            </p>
            {!loading && !campaigns.length && (
              <p className="py-8 text-slate-300">
                No campaigns yet. Save your first draft above.
              </p>
            )}
            <ul className="mt-3 divide-y divide-white/10">
              {campaigns.map(c => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                  key={c.id}
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">{c.subject}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {c.status} · {c.accepted} accepted · {c.remaining} queued
                      · {c.failed} failed · {c.skipped} skipped
                    </p>
                  </div>
                  {c.status === "draft" && (
                    <Button
                      className={secondary}
                      disabled={busy}
                      onClick={() => {
                        if (
                          dirty &&
                          (draft.subject || draft.body) &&
                          !window.confirm(
                            "Discard your unsaved changes and open this draft?"
                          )
                        )
                          return;
                        setSaved(c);
                        setDraft({ subject: c.subject, body: c.body });
                      }}
                    >
                      Edit draft
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {view === "activity" && (
        <section className={panel}>
          <h3 className="text-lg font-semibold">Delivery activity</h3>
          <p className="my-3 text-xs leading-6 text-slate-400">
            Updates every 10 seconds while this tab is visible. Temporary
            provider failures retry automatically. Each recipient gets an
            individual email; addresses are never shared with other subscribers.
          </p>
          {!loading && !deliveries.length && (
            <p className="py-8 text-slate-300">
              No email jobs yet. Confirmation emails and campaign deliveries
              will appear here.
            </p>
          )}
          <ul className="divide-y divide-white/10">
            {deliveries.map(row => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium">
                    {row.recipient}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {row.kind} ·{" "}
                    {row.status === "sent"
                      ? "Accepted by provider"
                      : row.status}{" "}
                    · {row.attempts} attempts · {date(row.created_at)}
                  </p>
                  {row.error_message && (
                    <p className="mt-2 text-xs text-amber-200">
                      {row.error_message}
                    </p>
                  )}
                </div>
                {row.status === "failed" && Boolean(row.retry_safe) && (
                  <Button
                    className={secondary}
                    disabled={busy || !sender.ready}
                    onClick={() =>
                      void action(
                        async () =>
                          (
                            await api.post(
                              `/admin/newsletter/deliveries/${row.id}/retry`
                            )
                          ).data.message
                      )
                    }
                  >
                    Retry safely
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {deliveryTotal} email jobs · Page {deliveryPage} of{" "}
              {Math.max(1, Math.ceil(deliveryTotal / 25))}
            </span>
            <div className="flex gap-2">
              <Button
                className={secondary}
                disabled={deliveryPage <= 1 || loading}
                onClick={() => setDeliveryPage(value => value - 1)}
              >
                Previous
              </Button>
              <Button
                className={secondary}
                disabled={deliveryPage * 25 >= deliveryTotal || loading}
                onClick={() => setDeliveryPage(value => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      )}
      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={open => !open && !busy && setConfirmation(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle>
              {confirmation === "send"
                ? "Send this newsletter?"
                : "Unsubscribe this address?"}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {confirmation === "send"
                ? `“${saved?.subject}” will be queued for all ${subscribed} currently subscribed addresses. Pending and unsubscribed addresses are excluded. Once email sending begins, it cannot be recalled.`
                : typeof confirmation === "object"
                  ? confirmation?.email
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              className={secondary}
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </Button>
            <Button className={primary} disabled={busy} onClick={confirm}>
              {busy
                ? "Working…"
                : confirmation === "send"
                  ? "Confirm send"
                  : "Confirm unsubscribe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
