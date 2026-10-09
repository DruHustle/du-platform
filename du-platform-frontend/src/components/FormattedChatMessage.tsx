import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormattedChatMessageProps {
  content: string;
  className?: string;
}

function renderInlineBold(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let boldIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <strong key={`${keyPrefix}-bold-${boldIndex++}`} className="font-semibold">
        {match[1]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export default function FormattedChatMessage({ content, className }: FormattedChatMessageProps) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const blocks = normalized.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <div className={cn("space-y-3 break-words", className)}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const isOrderedList = lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line));
        const isUnorderedList = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));

        if (isOrderedList) {
          return (
            <ol key={`ordered-${blockIndex}`} className="list-decimal pl-5 space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={`ordered-${blockIndex}-${lineIndex}`}>
                  {renderInlineBold(line.replace(/^\d+[.)]\s+/, ""), `ordered-${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (isUnorderedList) {
          return (
            <ul key={`unordered-${blockIndex}`} className="list-disc pl-5 space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={`unordered-${blockIndex}-${lineIndex}`}>
                  {renderInlineBold(line.replace(/^[-*]\s+/, ""), `unordered-${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        const paragraphLines = block.split("\n");
        return (
          <p key={`paragraph-${blockIndex}`} className="leading-relaxed">
            {paragraphLines.map((line, lineIndex) => (
              <Fragment key={`paragraph-${blockIndex}-${lineIndex}`}>
                {renderInlineBold(line, `paragraph-${blockIndex}-${lineIndex}`)}
                {lineIndex < paragraphLines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
