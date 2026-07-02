import type { ReactNode } from "react";

/**
 * Minimal, dependency-free markdown renderer for blog post bodies.
 * Intentionally never uses dangerouslySetInnerHTML — everything is built
 * as React elements, so there's no HTML/script injection surface.
 *
 * Supports: # / ## / ### headings, blank-line-separated paragraphs,
 * "- " bullet lists, **bold** and *italic* inline spans, and line breaks.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on **bold** and *italic* without regex lookbehind (broad JS engine support)
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((t) => t.length > 0);
  tokens.forEach((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*") && tok.endsWith("*")) {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{tok.slice(1, -1)}</em>);
    } else {
      nodes.push(tok);
    }
  });
  return nodes;
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = (source || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2];
      const cls =
        level === 1
          ? "font-display text-3xl sm:text-4xl tracking-tight mt-8 mb-3"
          : level === 2
            ? "font-display text-2xl sm:text-3xl tracking-tight mt-7 mb-3"
            : "font-display text-xl sm:text-2xl tracking-tight mt-6 mb-2";
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      blocks.push(
        <Tag key={`h-${key++}`} className={cls}>
          {renderInline(content, `h-${key}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul-${key++}`} className="list-disc space-y-1.5 pl-5 my-4 text-muted-foreground">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `li-${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph (consume until blank line)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`p-${key++}`} className="text-base leading-relaxed text-foreground/90 my-4">
        {paraLines.map((l, idx) => (
          <span key={idx}>
            {renderInline(l, `p-${key}-${idx}`)}
            {idx < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
  }

  return blocks;
}

export function excerptFromMarkdown(source: string, maxLen = 140): string {
  const plain = (source || "")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}