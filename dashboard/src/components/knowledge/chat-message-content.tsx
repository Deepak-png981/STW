import type { ReactNode } from "react";

type InlineSegment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "link"; label: string; href: string };

const INLINE_TOKEN_PATTERN =
  /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+[^\s<.,);:!?'"])/g;

function pushFormattedText(segments: InlineSegment[], value: string): void {
  if (!value) {
    return;
  }
  const boldParts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  boldParts.forEach((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      segments.push({ kind: "bold", value: part.slice(2, -2) });
      return;
    }
    const italicParts = part.split(/(\*[^*]+\*)/g).filter(Boolean);
    italicParts.forEach((italicPart) => {
      if (italicPart.startsWith("*") && italicPart.endsWith("*") && italicPart.length > 2) {
        segments.push({ kind: "italic", value: italicPart.slice(1, -1) });
        return;
      }
      segments.push({ kind: "text", value: italicPart });
    });
  });
}

function splitInlineMarkdown(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const matches = [...text.matchAll(INLINE_TOKEN_PATTERN)];

  if (matches.length === 0) {
    pushFormattedText(segments, text);
    return segments;
  }

  let cursor = 0;
  matches.forEach((match) => {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      pushFormattedText(segments, text.slice(cursor, matchIndex));
    }
    if (match[2] && match[3]) {
      segments.push({ kind: "link", label: match[2], href: match[3] });
    } else if (match[4]) {
      segments.push({ kind: "link", label: shortenUrlLabel(match[4]), href: match[4] });
    }
    cursor = matchIndex + match[0].length;
  });

  if (cursor < text.length) {
    pushFormattedText(segments, text.slice(cursor));
  }

  return segments;
}

function shortenUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = (parsed.pathname + parsed.search).replace(/\/$/, "");
    const host = parsed.hostname.replace(/^www\./, "");
    if (!path || path === "/") {
      return host;
    }
    const compactPath = path.length > 36 ? `${path.slice(0, 36)}…` : path;
    return `${host}${compactPath}`;
  } catch {
    return url.length > 48 ? `${url.slice(0, 48)}…` : url;
  }
}

function renderInlineSegments(segments: readonly InlineSegment[]): ReactNode[] {
  return segments.map((segment, index) => {
    switch (segment.kind) {
      case "text":
        return <span key={`text-${index}`}>{segment.value}</span>;
      case "bold":
        return <strong key={`bold-${index}`}>{segment.value}</strong>;
      case "italic":
        return <em key={`italic-${index}`}>{segment.value}</em>;
      case "link":
        return (
          <a
            key={`link-${index}`}
            href={segment.href}
            target="_blank"
            rel="noreferrer"
            className="knowledge-chat-inline-link"
          >
            {segment.label}
          </a>
        );
      default: {
        const exhaustiveCheck: never = segment;
        return exhaustiveCheck;
      }
    }
  });
}

export function ChatMessageContent({ content }: { content: string }) {
  const lines = content.split(/\n/);

  return (
    <div className="knowledge-chat-message-content">
      {lines.map((line, lineIndex) => (
        <p key={`line-${lineIndex}`} className="knowledge-chat-message-line">
          {line.trim() ? renderInlineSegments(splitInlineMarkdown(line)) : "\u00a0"}
        </p>
      ))}
    </div>
  );
}
