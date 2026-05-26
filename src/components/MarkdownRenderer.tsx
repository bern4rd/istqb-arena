import React from "react";

interface ParseBlock {
  type: "paragraph" | "header" | "table" | "list" | "divider" | "blank";
  content?: string;
  level?: number;
  headers?: string[];
  rows?: string[][];
  items?: { prefix: string; content: string }[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseInlineStyles(markup: string): string {
  if (!markup) return "";
  const escaped = escapeHtml(markup);
  let parsed = escaped.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-900 dark:text-slate-100'>$1</strong>");
  parsed = parsed.replace(/\*(.*?)\*/g, "<em class='italic text-slate-600 dark:text-slate-300'>$1</em>");
  parsed = parsed.replace(/`(.*?)`/g, "<code class='font-mono text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded'>$1</code>");
  return parsed;
}

export function preprocessInlineLists(text: string): string {
  if (!text) return "";
  let processed = text;
  
  // Detect parenthesized transition paths/flow diagrams, ex: "(INIT -> DEBUG -> OFF; INIT -> OPERATION -> ...)"
  // and convert them into beautifully structured bullet points
  processed = processed.replace(/\(([^)]*->[^)]*;[^)]*)\)\.?/gi, (match, p1) => {
    const paths = p1.split(";").map(path => "- " + path.trim().replace(/->/g, " → "));
    return ":\n" + paths.join("\n");
  });

  // Clean up inline lists enclosed in parentheses like "(i. Liberação... v. custo)"
  // First, if the text ends with a list item followed by ")", let's remove the closing parenthesis
  // but only if it's part of an inline list. We can check if there's a list item followed by ")" at the end.
  processed = processed.replace(/\b(i{1,3}|iv|v|vi{1,3}|ix|x|\d+|[b-hj-np-tv-zB-HJ-NP-TV-Z])[.)]\s+([^)]+)\)$/i, "$1. $2");
  
  // Also clean up starting parentheses before the first list item, e.g., "DevOps? (i. " -> "DevOps?\ni. "
  processed = processed.replace(/\(\s*\b(i{1,3}|iv|v|vi{1,3}|ix|x|\d+|[b-hj-np-tv-zB-HJ-NP-TV-Z])[.)]\s+/gi, "$1. ");

  // Clean up leading list separators followed by whitespace and a list item, e.g., "; ii. " -> " ii. "
  processed = processed.replace(/[,;]\s+\b(i{1,3}|iv|v|vi{1,3}|ix|x|\d+|[b-hj-np-tv-zB-HJ-NP-TV-Z])[.)]\s+/gi, " $1. ");

  // Now, split each list item onto a new line!
  processed = processed.replace(/(?<!-)\b(i{1,3}|iv|v|vi{1,3}|ix|x|\d+|[b-hj-np-tv-zB-HJ-NP-TV-Z])[.)]\s+/gi, "\n$1. ");
  
  // Format any other remaining -> to →
  processed = processed.replace(/->/g, " → ");

  // Clean up any double newlines or leading spaces in lines
  processed = processed.split("\n").map(line => line.trim()).filter(line => line.length > 0).join("\n");
  
  return processed;
}

interface MarkdownRendererProps {
  text: string;
  className?: string;
}

export default function MarkdownRenderer({ text, className = "text-xs sm:text-sm text-slate-800 dark:text-slate-200" }: MarkdownRendererProps) {
  if (!text) return null;

  const preprocessed = preprocessInlineLists(text);
  const lines = preprocessed.split("\n");
  const blocks: ParseBlock[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentList: { prefix: string; content: string }[] | null = null;

  const flushTable = () => {
    if (currentTable) {
      blocks.push({
        type: "table",
        headers: currentTable.headers,
        rows: currentTable.rows,
      });
      currentTable = null;
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: "list",
        items: currentList,
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Table parsing check
    if (trimmed.includes("|")) {
      flushList(); // list ends if table starts
      
      let cells = line.split("|");
      if (line.trim().startsWith("|")) cells = cells.slice(1);
      if (line.trim().endsWith("|")) cells = cells.slice(0, -1);
      cells = cells.map((c) => c.trim());

      const isSeparator = cells.every((c) => c.match(/^-+$/));
      if (isSeparator) {
        continue; // skip separator lines
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    }

    // Line is not part of a table, flush any active table
    flushTable();

    // 2. Divider check
    if (trimmed === "---") {
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    // 3. Blank line check
    if (trimmed === "") {
      flushList();
      blocks.push({ type: "blank" });
      continue;
    }

    // 4. Header check
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      flushList();
      blocks.push({
        type: "header",
        level: headerMatch[1].length,
        content: headerMatch[2],
      });
      continue;
    }

    // 5. List items check
    // Roman numerals: i, ii, iii, iv, v, vi, vii, viii, ix, x
    const romanMatch = trimmed.match(/^\s*(i{1,3}|iv|v|vi{1,3}|ix|x)[.)]\s+(.*)/i);
    // Numbers: 1., 2)
    const numMatch = trimmed.match(/^\s*(\d+)[.)]\s+(.*)/);
    // Letters: A., b)
    const letterMatch = trimmed.match(/^\s*([a-zA-Z])[.)]\s+(.*)/);
    // Bullets: - or * or •
    const bulletMatch = trimmed.match(/^\s*([-*•])\s+(.*)/);

    if (romanMatch) {
      if (!currentList) currentList = [];
      currentList.push({ prefix: romanMatch[1] + ".", content: romanMatch[2] });
      continue;
    } else if (numMatch) {
      if (!currentList) currentList = [];
      currentList.push({ prefix: numMatch[1] + ".", content: numMatch[2] });
      continue;
    } else if (letterMatch) {
      if (!currentList) currentList = [];
      currentList.push({ prefix: letterMatch[1] + ".", content: letterMatch[2] });
      continue;
    } else if (bulletMatch) {
      if (!currentList) currentList = [];
      currentList.push({ prefix: "•", content: bulletMatch[2] });
      continue;
    }

    // 6. Regular paragraph
    flushList();
    blocks.push({
      type: "paragraph",
      content: line,
    });
  }

  // Flush remaining active elements
  flushTable();
  flushList();

  return (
    <div className={`space-y-2 leading-relaxed font-sans w-full ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "header": {
            const headingLevel = block.level || 3;
            if (headingLevel === 1) {
              return (
                <h2 key={idx} className="font-display font-extrabold text-base sm:text-lg text-blue-900 dark:text-blue-400 pt-2 pb-0.5">
                  {block.content}
                </h2>
              );
            }
            if (headingLevel === 2) {
              return (
                <h3 key={idx} className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 pt-2 pb-0.5">
                  {block.content}
                </h3>
              );
            }
            return (
              <h4 key={idx} className="font-display font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-0.5 pt-1.5">
                {block.content}
              </h4>
            );
          }
          case "divider":
            return <hr key={idx} className="my-3 border-slate-200 dark:border-slate-800" />;
          case "blank":
            return <div key={idx} className="h-1.5" />;
          case "paragraph":
            return (
              <p
                key={idx}
                dangerouslySetInnerHTML={{ __html: parseInlineStyles(block.content || "") }}
                className="leading-relaxed text-current"
              />
            );
          case "list":
            return (
              <div key={idx} className="space-y-1.5 my-2">
                {block.items?.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start gap-2.5 pl-3 leading-relaxed">
                    <span className="text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0 min-w-[22px] text-right select-none">
                      {item.prefix}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{ __html: parseInlineStyles(item.content) }}
                      className="flex-1 text-current font-medium"
                    />
                  </div>
                ))}
              </div>
            );
          case "table":
            return (
              <div key={idx} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-3xs w-full bg-white dark:bg-slate-900/60 transition-colors">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {block.headers?.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="p-3 font-semibold"
                          dangerouslySetInnerHTML={{ __html: parseInlineStyles(h) }}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {block.rows?.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="p-3 text-slate-800 dark:text-slate-300"
                            dangerouslySetInnerHTML={{ __html: parseInlineStyles(cell) }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
