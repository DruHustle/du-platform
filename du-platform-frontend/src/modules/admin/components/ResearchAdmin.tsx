import { useAdminDraft } from "./useAdminDraft";
import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export default function ResearchAdmin({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { setDirty, confirmDiscard } = useAdminDraft(onDirtyChange);
  const [sourceText, setSourceText] = useState("");
  const [kind, setKind] = useState("ntir"),
    [key, setKey] = useState(""),
    [profile, setProfile] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Research handoffs</h2>
      <p>
        Record primary sources and actual review dates. A source check is not an
        investment endorsement. Confirm promoter contact before recording
        promoter confirmation.
      </p>
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (!confirmDiscard()) return;
          setDirty(false);
          setBusy(true);
          setMessage("");
          try {
            const { data } = await api.get(
              `/admin/research/${kind}/${encodeURIComponent(key)}`
            );
            setSourceText(data.profile?.sources?.join("\n") || "");
            setProfile(
              data.profile || {
                sources: [],
                reviewedAt: null,
                status: "unreviewed",
                promoterContact: "",
                nextStep: "",
              }
            );
          } catch (err) {
            setMessage(getApiErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
        className="flex flex-wrap gap-3"
      >
        <label>
          Profile type
          <select
            className="block min-h-11 bg-slate-900 p-2"
            aria-label="Profile type"
            value={kind}
            onChange={e => {
              if (!confirmDiscard()) return;
              setDirty(false);
              setKind(e.target.value);
              setProfile(null);
            }}
          >
            <option value="ntir">Directory entry</option>
            <option value="project">Project</option>
          </select>
        </label>
        <label>
          Directory ID or project URL key
          <Input
            value={key}
            onChange={e => {
              if (!confirmDiscard()) return;
              setDirty(false);
              setKey(e.target.value);
              setProfile(null);
            }}
            required
          />
        </label>
        <Button disabled={busy} type="submit">
          Load
        </Button>
      </form>
      {message && <p role="status">{message}</p>}
      {profile && (
        <form
          className="space-y-4"
          onChangeCapture={() => setDirty(true)}
          onSubmit={async e => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await api.put(
                `/admin/research/${kind}/${encodeURIComponent(key)}`,
                {
                  ...profile,
                  sources: sourceText
                    .split(/\r?\n/)
                    .map(v => v.trim())
                    .filter(Boolean),
                }
              );
              setMessage("Research handoff saved.");
              setDirty(false);
            } catch (err) {
              setMessage(getApiErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            Primary sources (one HTTPS URL per line)
            <Textarea
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
            />
          </label>
          <label className="block">
            Last actually reviewed
            <Input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={profile.reviewedAt || ""}
              onChange={e =>
                setProfile({ ...profile, reviewedAt: e.target.value || null })
              }
            />
          </label>
          <label className="block">
            Review status
            <select
              aria-label="Review status"
              value={profile.status}
              className="block min-h-11 bg-slate-900"
              onChange={e => setProfile({ ...profile, status: e.target.value })}
            >
              {["unreviewed", "source_checked", "promoter_confirmed"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            Confirmed promoter contact (HTTPS / mailto)
            <Input
              value={profile.promoterContact}
              onChange={e =>
                setProfile({ ...profile, promoterContact: e.target.value })
              }
            />
          </label>
          <label className="block">
            Research next step
            <Textarea
              value={profile.nextStep}
              onChange={e =>
                setProfile({ ...profile, nextStep: e.target.value })
              }
            />
          </label>
          <Button type="submit" disabled={busy}>
            Save handoff
          </Button>
        </form>
      )}
    </section>
  );
}
