import React, { useState } from "react";
import { useSession } from "./session";
import { Action, Card, Copy, Field, Message } from "./ui";

export function AccountDeletion({ accountId }: { accountId: number }) {
  const { authorized } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  async function submit() {
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      const result = await authorized<{ requestId: string; status: string }>(
        "/auth/deletion-request",
        {
          method: "POST",
          body: { accountId, password, confirm: true },
        }
      );
      if (result.status !== "requested" || !result.requestId)
        throw new Error("The request could not be confirmed. Please retry.");
      setPassword("");
      setReference(result.requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (reference)
    return (
      <Card>
        <Message
          message={`Deletion request received. Reference: ${reference}. The operator will review associated records and contact you about completion.`}
        />
      </Card>
    );
  if (!expanded)
    return (
      <Action
        secondary
        title="Request account deletion"
        onPress={() => setExpanded(true)}
      />
    );
  return (
    <Card>
      <Copy>
        Request permanent deletion of your account, saved trips and associated
        personal data. The operator reviews records held separately and any
        retention obligations before closing the account.
      </Copy>
      <Field
        label="Current password"
        autoComplete="current-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Message error message={error} /> : null}
      <Action
        title={busy ? "Sending…" : "Confirm deletion request"}
        disabled={busy || !password}
        onPress={() => void submit()}
      />
      <Action
        secondary
        title="Cancel"
        disabled={busy}
        onPress={() => {
          setExpanded(false);
          setPassword("");
          setError("");
        }}
      />
    </Card>
  );
}
