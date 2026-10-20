type TextToken = { value: string; start: number };

function tokenize(text: string): TextToken[] {
  // Keep source offsets so removing an overlap preserves the model's Markdown.
  const plain = text
    .replace(/\*\*|__/g, "  ")
    .replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, match =>
      " ".repeat(match.length)
    );
  return Array.from(plain.matchAll(/\S+/g), match => ({
    value: match[0],
    start: match.index!,
  }));
}

function passageStart(text: string, index: number): number {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  if (/^[ \t]*(?:[-*+]|\d+[.)])?[ \t*_]*$/.test(text.slice(lineStart, index))) {
    return lineStart;
  }
  while (index > 0 && /[*_]/.test(text[index - 1])) index -= 1;
  return index;
}

function removeRepeatedProse(text: string): string {
  // Only remove substantial, adjacent, exact repetitions; leave short emphasis alone.
  let tokens = tokenize(text);
  for (let start = 0; start < tokens.length; start += 1) {
    for (let next = start + 6; next <= (tokens.length + start) / 2; next += 1) {
      if (tokens[start].value !== tokens[next].value) continue;
      if (tokens[next].start - tokens[start].start < 30) continue;
      if (
        !tokens
          .slice(start, next)
          .every((token, offset) => token.value === tokens[next + offset].value)
      )
        continue;

      // Keep the second occurrence: it may complete a restarted sentence or list item.
      text =
        text.slice(0, passageStart(text, tokens[start].start)) +
        text.slice(passageStart(text, tokens[next].start));
      tokens = tokenize(text);
      start -= 1;
      break;
    }
  }
  return text;
}

export function removeRepeatedReplyText(reply: string): string {
  try {
    if (typeof JSON.parse(reply) === "object") return reply;
  } catch {
    // Ordinary chat prose still needs repetition cleanup.
  }
  // Repetition can be meaningful in code, inline examples, and tables.
  const protectedText =
    /(```[\s\S]*?(?:```|(?![\s\S]))|~~~[\s\S]*?(?:~~~|(?![\s\S]))|`[^`\n]+`|^(?: {4}|\t|[ \t]*\|).*$)/gm;
  return reply
    .split(protectedText)
    .map((part, index) => (index % 2 ? part : removeRepeatedProse(part)))
    .join("");
}

export function mergeReplyContinuation(
  reply: string,
  continuation: string
): string {
  const first = tokenize(reply);
  const second = tokenize(continuation);
  for (
    let length = Math.min(first.length, second.length);
    length >= 4;
    length -= 1
  ) {
    const start = first.length - length;
    if (
      !second
        .slice(0, length)
        .every((token, offset) => token.value === first[start + offset].value)
    )
      continue;
    const prefix = reply.slice(0, passageStart(reply, first[start].start));
    return `${prefix}${continuation}`.trim();
  }
  const separator = /^(?:[-*+]\s|\d+[.)]\s|#{1,6}\s)/.test(continuation)
    ? "\n\n"
    : " ";
  return `${reply}${separator}${continuation}`.trim();
}
