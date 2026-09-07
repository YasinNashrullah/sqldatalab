"use client";

import React, { useState } from "react";
import { Check, Copy, Code, Lightbulb, AlertTriangle, FileText, ArrowRight } from "lucide-react";

interface FormattedAIResponseProps {
  content: string;
  onApplySQL?: (sql: string) => void;
}

export function FormattedAIResponse({ content, onApplySQL }: FormattedAIResponseProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content || !content.trim()) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Helper to render inline markdown: **bold**, `code`, *italic*
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Regex for inline elements: `code`, **bold**, *italic*
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Find matches for inline code or bold
      const codeMatch = remaining.match(/`([^`]+)`/);
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

      // Determine which match comes first
      const matches = [
        codeMatch ? { type: "code", index: codeMatch.index!, match: codeMatch } : null,
        boldMatch ? { type: "bold", index: boldMatch.index!, match: boldMatch } : null,
        italicMatch ? { type: "italic", index: italicMatch.index!, match: italicMatch } : null,
      ].filter(Boolean) as { type: string; index: number; match: RegExpMatchArray }[];

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      // Sort by earliest occurrence
      matches.sort((a, b) => a.index - b.index);
      const earliest = matches[0];

      // Add text before match
      if (earliest.index > 0) {
        parts.push(remaining.substring(0, earliest.index));
      }

      const matchContent = earliest.match[1];
      if (earliest.type === "code") {
        parts.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 mx-0.5 font-mono text-[11px] font-bold rounded-xs bg-[var(--win-surface)] text-blue-700 dark:text-blue-300 border border-[var(--win-border-dark)]"
          >
            {matchContent}
          </code>
        );
      } else if (earliest.type === "bold") {
        parts.push(
          <strong key={`bold-${keyIdx++}`} className="font-bold text-[var(--win-text)]">
            {matchContent}
          </strong>
        );
      } else if (earliest.type === "italic") {
        parts.push(
          <em key={`italic-${keyIdx++}`} className="italic text-[var(--win-text-muted)]">
            {matchContent}
          </em>
        );
      }

      remaining = remaining.substring(earliest.index + earliest.match[0].length);
    }

    return parts;
  };

  // Parse raw text into structured sections: code blocks, headings, callouts, lists, paragraphs
  const rawSections: Array<{
    type: "code" | "heading" | "callout" | "list_item" | "paragraph";
    level?: number;
    language?: string;
    content: string;
    badge?: string;
  }> = [];

  // Extract code blocks first
  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parseTextBlocks(textBefore, rawSections);
    }

    const lang = (match[1] || "sql").toLowerCase();
    const code = match[2].trim();
    rawSections.push({
      type: "code",
      language: lang,
      content: code,
    });

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim()) {
    parseTextBlocks(remainingText, rawSections);
  }

  function parseTextBlocks(text: string, output: typeof rawSections) {
    const lines = text.split("\n");
    let currentParagraph = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        if (currentParagraph) {
          output.push({ type: "paragraph", content: currentParagraph });
          currentParagraph = "";
        }
        continue;
      }

      // Check for Headings: #, ##, ###, ####
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        if (currentParagraph) {
          output.push({ type: "paragraph", content: currentParagraph });
          currentParagraph = "";
        }
        output.push({
          type: "heading",
          level: headingMatch[1].length,
          content: headingMatch[2].trim(),
        });
        continue;
      }

      // Check for Callouts / Tips: 💡 or *Pro-tip:* or ⚠️
      if (line.startsWith("💡") || line.includes("Pro-tip:") || line.startsWith("⚠️") || line.toLowerCase().startsWith("note:")) {
        if (currentParagraph) {
          output.push({ type: "paragraph", content: currentParagraph });
          currentParagraph = "";
        }
        output.push({
          type: "callout",
          content: line,
        });
        continue;
      }

      // Check for Bullet Lists: - **KEYWORD**: explanation or - bullet or 1. bullet
      const listMatch = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
      if (listMatch) {
        if (currentParagraph) {
          output.push({ type: "paragraph", content: currentParagraph });
          currentParagraph = "";
        }

        const itemContent = listMatch[1].trim();
        // Check if item has a bold lead like - **SELECT**: description
        const keywordLeadMatch = itemContent.match(/^\*\*([A-Z_\s]+)\*\*:\s*(.+)$/i);
        if (keywordLeadMatch) {
          output.push({
            type: "list_item",
            badge: keywordLeadMatch[1].trim(),
            content: keywordLeadMatch[2].trim(),
          });
        } else {
          output.push({
            type: "list_item",
            content: itemContent,
          });
        }
        continue;
      }

      // Regular line: append to current paragraph
      if (currentParagraph) {
        currentParagraph += " " + line;
      } else {
        currentParagraph = line;
      }
    }

    if (currentParagraph) {
      output.push({ type: "paragraph", content: currentParagraph });
    }
  }

  return (
    <div className="space-y-2.5 text-xs select-text">
      {rawSections.map((item, idx) => {
        // 1. Heading Block
        if (item.type === "heading") {
          const isMainHeading = item.level === 1 || item.level === 2;
          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 pt-1.5 pb-1 ${
                isMainHeading
                  ? "border-b border-[var(--win-border-dark)] font-bold text-sm text-[var(--win-text)]"
                  : "font-bold text-xs text-[var(--win-text)]"
              }`}
            >
              <FileText size={13} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>{item.content}</span>
            </div>
          );
        }

        // 2. Code Block
        if (item.type === "code") {
          const isSQL = item.language === "sql" || item.content.toUpperCase().includes("SELECT");
          return (
            <div
              key={idx}
              className="win-inset bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)] overflow-hidden my-2"
            >
              {/* Code Header Bar */}
              <div className="flex items-center justify-between px-2.5 py-1 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)] text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Code size={12} className="text-blue-600 dark:text-blue-400" />
                  <span className="font-mono font-bold uppercase text-[10px] text-[var(--win-text-muted)]">
                    {item.language || "SQL"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(item.content, idx)}
                    className="win-btn text-[10px] py-0.5 px-1.5 flex items-center gap-1"
                    title="Salin ke Clipboard"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check size={11} className="text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                  {isSQL && onApplySQL && (
                    <button
                      onClick={() => onApplySQL(item.content)}
                      className="win-btn win-btn-primary text-[10px] py-0.5 px-2 flex items-center gap-1 font-bold"
                      title="Muat SQL ke Editor"
                    >
                      <ArrowRight size={11} />
                      <span>Terapkan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Code Pre Body */}
              <pre className="p-2.5 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre text-[var(--win-text)] select-text bg-[var(--win-inset-bg)]">
                {item.content}
              </pre>
            </div>
          );
        }

        // 3. Callout / Tip Block
        if (item.type === "callout") {
          const isWarning = item.content.includes("⚠️") || item.content.toLowerCase().includes("error");
          return (
            <div
              key={idx}
              className={`p-2 win-inset flex items-start gap-2 text-xs rounded-xs my-1.5 ${
                isWarning
                  ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-400 text-rose-950 dark:text-rose-200"
                  : "bg-blue-50 dark:bg-blue-950/40 border border-blue-400 text-blue-950 dark:text-blue-200"
              }`}
            >
              {isWarning ? (
                <AlertTriangle size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Lightbulb size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed flex-1">
                {renderInlineMarkdown(item.content)}
              </div>
            </div>
          );
        }

        // 4. List Item Block
        if (item.type === "list_item") {
          return (
            <div key={idx} className="flex items-start gap-2 py-0.5 pl-1 text-xs">
              {item.badge ? (
                <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-400 dark:border-blue-700 flex-shrink-0">
                  {item.badge}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 mt-1.5 rounded-xs bg-[var(--win-text-muted)] flex-shrink-0" />
              )}
              <div className="leading-relaxed flex-1 text-[var(--win-text)]">
                {renderInlineMarkdown(item.content)}
              </div>
            </div>
          );
        }

        // 5. Paragraph Block
        return (
          <p key={idx} className="leading-relaxed text-[var(--win-text)] my-1">
            {renderInlineMarkdown(item.content)}
          </p>
        );
      })}
    </div>
  );
}
