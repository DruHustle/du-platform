export function outboundMessagesPaused() {
  return (
    process.env.RECOVERY_MODE === "true" ||
    process.env.OUTBOUND_MESSAGES_PAUSED === "true"
  );
}
