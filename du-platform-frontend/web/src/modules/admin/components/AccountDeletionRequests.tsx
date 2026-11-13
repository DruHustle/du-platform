import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type DeletionRequest = {
  requestId: string;
  receivedAt: string;
  accountId: number;
  email: string;
  emailVerifiedAt: string | null;
};
export default function AccountDeletionRequests() {
  const [rows, setRows] = useState<DeletionRequest[]>([]);
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setLoaded(false);
    setRows([]);
    setSelected("");
    api
      .get("/admin/service-inbox/deletion-requests", {
        params: { page },
        signal: c.signal,
      })
      .then(({ data }) => {
        if (!c.signal.aborted) {
          setRows(data.requests);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!c.signal.aborted)
          setMessage("Deletion requests could not be loaded. Try refreshing.");
      });
    return () => c.abort();
  }, [page, revision]);
  async function fulfill(row: DeletionRequest) {
    if (busy || selected !== row.requestId) return;
    setBusy(true);
    try {
      const { data } = await api.post(
        `/admin/service-inbox/deletion-requests/${row.requestId}/fulfill`,
        { associatedDataReviewed: true, customerNotificationArranged: true }
      );
      if (data?.status !== "fulfilled" || data.requestId !== row.requestId)
        throw new Error();
      setMessage(
        `Closed account ${row.accountId}. Completion reference: ${row.requestId}.`
      );
    } catch (e) {
      const code = (
        e as { response?: { data?: { error?: { code?: string } } } }
      )?.response?.data?.error?.code;
      setMessage(
        code === "DELETION_IDENTITY_REVIEW"
          ? "Review the account identity and remove any administrator reservation first."
          : `Completion could not be confirmed for ${row.requestId}. Refresh the queue and check the audit receipt before retrying.`
      );
    } finally {
      setBusy(false);
      setRevision(value => value + 1);
    }
  }
  function reload() {
    setMessage("");
    setRevision(value => value + 1);
  }
  return (
    <section aria-label="Account deletion requests" className="space-y-3">
      <h3 className="font-semibold">Account deletion requests</h3>
      <Button disabled={busy} variant="outline" onClick={reload}>
        Refresh deletion requests
      </Button>
      {message && <p role="status">{message}</p>}
      {loaded && !rows.length && <p>No pending requests on this page.</p>}
      {rows.map(row => (
        <article
          key={row.requestId}
          className="space-y-2 rounded-xl border border-white/15 p-4 break-words"
        >
          <p>
            Account {row.accountId} · {row.email} ·{" "}
            {row.emailVerifiedAt ? "Verified email" : "Unverified email"}
          </p>
          <p>
            Requested {row.receivedAt} · {row.requestId}
          </p>
          {selected === row.requestId ? (
            <>
              <p>
                Review ownership of separately held records, erase associated
                personal data or document an applicable retention requirement,
                and arrange the completion notice. A matching email alone does
                not establish ownership of a guest order. Closing this account
                permanently removes its profile, sessions, saved trips and
                feature notices.
              </p>
              <Button disabled={busy} onClick={() => void fulfill(row)}>
                Confirm review and permanently close account {row.accountId}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => setSelected("")}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => setSelected(row.requestId)}
            >
              Review deletion request
            </Button>
          )}
        </article>
      ))}
      <div className="flex gap-3">
        <Button
          disabled={busy || page === 1}
          variant="outline"
          onClick={() => setPage(value => value - 1)}
        >
          Previous requests
        </Button>
        <Button
          disabled={busy || rows.length < 25}
          variant="outline"
          onClick={() => setPage(value => value + 1)}
        >
          Next requests
        </Button>
      </div>
    </section>
  );
}
