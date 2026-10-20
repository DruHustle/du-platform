export type ReplyCompletion = {
  reply: string;
  truncated: boolean;
  finishReason?: string;
};

export class IncompleteOnesaReplyError extends Error {
  readonly code = "ONESA_INCOMPLETE_REPLY";

  constructor() {
    super("Onesa could not finish a complete response. Please try again.");
    this.name = "IncompleteOnesaReplyError";
  }
}

export async function finishOnesaReply(
  first: ReplyCompletion,
  rewriteReply: () => Promise<ReplyCompletion>
): Promise<ReplyCompletion> {
  if (first.reply.trim() && !first.truncated) return first;

  // Start over rather than joining fragments that may end halfway through a word.
  // Only a provider-confirmed complete answer may leave this recovery path.
  const rewritten = await rewriteReply();
  if (rewritten.reply.trim() && !rewritten.truncated) return rewritten;
  throw new IncompleteOnesaReplyError();
}
