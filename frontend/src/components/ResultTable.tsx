"use client";

import React, { useState } from "react";
import { 
  Download, 
  Copy, 
  Clock, 
  Hash, 
  AlertCircle, 
  Sparkles,
  ChevronDown,
  GitCompare,
  SlidersHorizontal,
  Table as TableIcon
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ResultTableProps {
  columns: { name: string; type: string }[];
  rows: any[][];
  executionTimeMs: number;
  rowCount: number;
  error: string | null;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExplainErrorWithAI: (err: string) => void;
  onOpenAdvancedExport?: () => void;
  onComparePrevious?: () => void;
  hasPreviousRun?: boolean;
}

function ResultTableComponent({
  columns,
  rows,
  executionTimeMs,
  rowCount,
  error,
  onExportCSV,
  onExportJSON,
  onExplainErrorWithAI,
  onOpenAdvancedExport,
  onComparePrevious,
  hasPreviousRun,
}: ResultTableProps) {
  const { t, language } = useLanguage();
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const copyAllAsCSV = () => {
    const headerLine = columns.map((c) => c.name).join(",");
    const rowLines = rows.map((r) => r.map((v) => (v === null ? "" : `"${v}"`)).join(","));
    const csvContent = [headerLine, ...rowLines].join("\n");
    navigator.clipboard.writeText(csvContent);
    setShowExportMenu(false);
    alert(language === "id" ? "Hasil disalin ke clipboard sebagai CSV!" : "Results copied to clipboard as CSV!");
  };

  const copyAllAsMarkdown = () => {
    const headerLine = `| ${columns.map((c) => c.name).join(" | ")} |`;
    const separatorLine = `| ${columns.map(() => "---").join(" | ")} |`;
    const rowLines = rows.map(
      (r) => `| ${r.map((v) => (v === null ? "NULL" : String(v).replace(/\|/g, "\\|"))).join(" | ")} |`
    );
    const mdContent = [headerLine, separatorLine, ...rowLines].join("\n");
    navigator.clipboard.writeText(mdContent);
    setShowExportMenu(false);
    alert(language === "id" ? "Hasil disalin ke clipboard sebagai tabel Markdown!" : "Results copied to clipboard as Markdown table!");
  };

  const downloadMarkdown = () => {
    const headerLine = `| ${columns.map((c) => c.name).join(" | ")} |`;
    const separatorLine = `| ${columns.map(() => "---").join(" | ")} |`;
    const rowLines = rows.map(
      (r) => `| ${r.map((v) => (v === null ? "NULL" : String(v).replace(/\|/g, "\\|"))).join(" | ")} |`
    );
    const mdContent = [headerLine, separatorLine, ...rowLines].join("\n");
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_result_${Date.now()}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  if (error) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center overflow-y-auto select-text">
        <div className="win-window max-w-lg w-full p-0">
          <div className="win-titlebar bg-gradient-to-r from-rose-700 to-rose-900 text-white">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-300" />
              <span className="font-bold">{t.results.errorTitle}</span>
            </div>
            <button className="win-control-btn win-close" title={language === "id" ? "Tutup" : "Close"}>✕</button>
          </div>
          <div className="p-4 space-y-3 bg-[var(--win-surface)] text-[var(--win-text)]">
            <div className="win-inset p-3 text-xs font-mono text-rose-600 bg-[var(--win-inset-bg)] break-words whitespace-pre-wrap select-text">
              {error}
            </div>
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-mono text-[11px] text-[var(--win-text-muted)]">
                {t.results.executionTime}: {executionTimeMs}ms
              </span>
              <button
                onClick={() => onExplainErrorWithAI(error)}
                className="win-btn win-btn-primary font-bold text-xs"
              >
                <Sparkles size={12} />
                <span>{t.results.askAiFix}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--win-text-muted)]">
        <TableIcon size={32} className="opacity-40 mb-2" />
        <p className="text-xs font-bold">{t.results.noResults}</p>
        <p className="text-[11px] mt-1">{t.results.noResultsSub}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Table Metrics & Action Bar */}
      <div className="win-status-bar px-2 py-1 justify-between flex-wrap gap-1">
        {/* Status Indicators */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="win-status-panel font-bold text-emerald-700 bg-emerald-50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>{t.results.success}</span>
          </div>
          <div className="win-status-panel font-mono text-[11px]">
            <Clock size={11} className="text-[var(--win-text-muted)]" />
            <span>{executionTimeMs}ms</span>
          </div>
          <div className="win-status-panel font-mono text-[11px]">
            <Hash size={11} className="text-[var(--win-text-muted)]" />
            <span>{rowCount.toLocaleString()} {t.results.rows}</span>
          </div>
          <div className="win-status-panel font-mono text-[11px] hidden sm:flex">
            <span>{columns.length} {t.results.columns}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {hasPreviousRun && onComparePrevious && (
            <button
              onClick={onComparePrevious}
              className="win-btn text-xs"
              title={t.results.diffPrevious}
            >
              <GitCompare size={11} className="text-indigo-600" />
              <span>{t.results.diffPrevious}</span>
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="win-btn text-xs font-bold"
            >
              <Download size={11} />
              <span>{t.results.export}</span>
              <ChevronDown size={11} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 win-outset p-1 z-50 shadow-2xl text-left text-xs">
                {onOpenAdvancedExport && (
                  <>
                    <button
                      onClick={() => {
                        onOpenAdvancedExport();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2 font-semibold text-indigo-700"
                    >
                      <SlidersHorizontal size={11} />
                      <span>{t.results.exportCustom}</span>
                    </button>
                    <div className="border-t border-[var(--win-border-dark)] my-1" />
                  </>
                )}
                <button
                  onClick={() => {
                    onExportCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
                >
                  <Download size={11} />
                  <span>{t.results.downloadCsv}</span>
                </button>
                <button
                  onClick={() => {
                    onExportJSON();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
                >
                  <Download size={11} />
                  <span>{t.results.downloadJson}</span>
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="w-full text-left px-2 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
                >
                  <Download size={11} />
                  <span>{t.results.downloadMd}</span>
                </button>
                <div className="border-t border-[var(--win-border-dark)] my-1" />
                <button
                  onClick={copyAllAsCSV}
                  className="w-full text-left px-2 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
                >
                  <Copy size={11} />
                  <span>{t.results.copyCsv}</span>
                </button>
                <button
                  onClick={copyAllAsMarkdown}
                  className="w-full text-left px-2 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
                >
                  <Copy size={11} />
                  <span>{t.results.copyMd}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Classic 2D Boxy Windows Grid (Sunken Container) */}
      <div className="flex-1 overflow-auto win-inset m-1 bg-[var(--win-inset-bg)]">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead className="sticky top-0 z-10 select-none">
            <tr>
              <th className="win-outset !border-t-0 !border-l-0 p-1.5 w-10 text-center text-[10px] font-bold text-[var(--win-text-muted)]">
                #
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="win-outset !border-t-0 !border-l-0 p-1.5 px-2.5 font-bold text-[11px] whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--win-text)]">{col.name}</span>
                    <span className="text-[9px] px-1 bg-[var(--win-surface-alt)] border border-[var(--win-border-dark)] text-[var(--win-text-muted)] font-normal uppercase">
                      {col.type}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[11px] divide-y divide-[var(--win-border-medium)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-[var(--win-text-muted)]">
                  <div className="flex flex-col items-center gap-2">
                    <TableIcon size={28} className="opacity-30" />
                    <p className="text-xs font-bold">{language === "id" ? "Query berhasil, tapi tidak ada baris data" : "Query succeeded, but returned no rows"}</p>
                    <p className="text-[10px]">{language === "id" ? "Coba ubah filter WHERE atau periksa data tabel" : "Try adjusting WHERE filters or check table data"}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/50">
                  <td className="p-1 text-center font-bold text-[var(--win-text-muted)] border-r border-[var(--win-border-medium)] select-none bg-[var(--win-surface)]">
                    {rIdx + 1}
                  </td>
                  {row.map((val, cIdx) => {
                    const cellId = `${rIdx}-${cIdx}`;
                    const isCopied = copiedCell === cellId;
                    return (
                      <td
                        key={cIdx}
                        onClick={() => {
                          const sel = typeof window !== "undefined" ? window.getSelection()?.toString() : "";
                          if (sel && sel.trim().length > 0) return;
                          copyToClipboard(val === null ? "NULL" : String(val), cellId);
                        }}
                        title="Click or drag to select/copy"
                        className="p-1.5 px-2.5 border-r border-[var(--win-border-medium)] max-w-xs truncate cursor-pointer hover:bg-blue-100/60 relative group select-text text-[var(--win-text)]"
                      >
                        {val === null ? (
                          <span className="px-1 py-0.2 text-[9px] font-bold bg-[var(--win-surface-alt)] text-[var(--win-text-muted)] border border-[var(--win-border-dark)]">
                            NULL
                          </span>
                        ) : (
                          <span>{String(val)}</span>
                        )}
                        {isCopied && (
                          <span className="absolute right-1 top-0.5 text-[9px] text-white bg-[#0055ea] px-1 shadow font-sans font-bold">
                            {t.results.copied}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const ResultTable = React.memo(ResultTableComponent);
