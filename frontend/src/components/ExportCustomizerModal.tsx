"use client";

import React, { useState } from "react";
import { 
  Download, 
  Copy, 
  Check, 
  FileSpreadsheet
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ExportCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  rows: any[][];
  defaultFilename?: string;
}

export type ExportFormat = "csv_comma" | "csv_semicolon" | "tsv" | "pipe" | "json" | "markdown";

export const ExportCustomizerModal: React.FC<ExportCustomizerModalProps> = ({
  isOpen,
  onClose,
  columns,
  rows,
  defaultFilename = "query_results",
}) => {
  const { t, language } = useLanguage();
  const [format, setFormat] = useState<ExportFormat>("csv_comma");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [quoteAll, setQuoteAll] = useState(false);
  const [filename, setFilename] = useState(defaultFilename);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateExportText = (): string => {
    if (format === "json") {
      const dataObjects = rows.map((row) => {
        const obj: Record<string, any> = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
      return JSON.stringify(dataObjects, null, 2);
    }

    if (format === "markdown") {
      const headerRow = `| ${columns.join(" | ")} |`;
      const sepRow = `| ${columns.map(() => "---").join(" | ")} |`;
      const dataRows = rows.map(
        (row) => `| ${row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).replace(/\|/g, "\\|"))).join(" | ")} |`
      );
      return [headerRow, sepRow, ...dataRows].join("\n");
    }

    // Delimited formats
    let delimiter = ",";
    if (format === "csv_semicolon") delimiter = ";";
    if (format === "tsv") delimiter = "\t";
    if (format === "pipe") delimiter = "|";

    const escapeField = (val: any): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (quoteAll || str.includes(delimiter) || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];
    if (includeHeaders) {
      lines.push(columns.map(escapeField).join(delimiter));
    }
    rows.forEach((row) => {
      lines.push(row.map(escapeField).join(delimiter));
    });

    return lines.join("\n");
  };

  const handleCopyClipboard = () => {
    const text = generateExportText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = generateExportText();
    let ext = "csv";
    let mime = "text/csv;charset=utf-8;";

    if (format === "tsv") {
      ext = "tsv";
      mime = "text/tab-separated-values;charset=utf-8;";
    } else if (format === "json") {
      ext = "json";
      mime = "application/json;charset=utf-8;";
    } else if (format === "markdown") {
      ext = "md";
      mime = "text/markdown;charset=utf-8;";
    } else if (format === "pipe") {
      ext = "txt";
      mime = "text/plain;charset=utf-8;";
    }

    // Add UTF-8 BOM for Excel compatibility on CSV/TSV
    const content = (format.startsWith("csv") || format === "tsv") ? `\uFEFF${text}` : text;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename || "export"}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-lg shadow-2xl p-0 flex flex-col bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-amber-300" />
            <span className="font-bold">{t.exportModal.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.exportModal.cancel}
          >
            ✕
          </button>
        </div>

        {/* Sub-banner Info */}
        <div className="win-status-bar px-2 py-1 justify-between text-xs border-b border-[var(--win-border-dark)] font-mono">
          <span>{t.exportModal.targetInfo(rows.length, columns.length)}</span>
          <span>UTF-8 Supported</span>
        </div>

        {/* Form Body */}
        <div className="p-3 space-y-3 text-xs">
          {/* Format Picker */}
          <div>
            <label className="font-bold block mb-1">{t.exportModal.chooseFormat}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { 
                  id: "csv_comma", 
                  label: language === "id" ? "CSV (Koma ,)" : "CSV (Comma ,)", 
                  desc: language === "id" ? "Standar global" : "Global standard" 
                },
                { 
                  id: "csv_semicolon", 
                  label: language === "id" ? "CSV (Titik Koma ;)" : "CSV (Semicolon ;)", 
                  desc: language === "id" ? "Excel Indonesia / Eropa" : "Excel (Semicolon locale)" 
                },
                { 
                  id: "tsv", 
                  label: "TSV (Tab \\t)", 
                  desc: language === "id" ? "Paste Spreadsheet" : "Spreadsheet Paste" 
                },
                { 
                  id: "pipe", 
                  label: "Pipe (|)", 
                  desc: language === "id" ? "Delimiter pipa" : "Pipe delimiter" 
                },
                { 
                  id: "json", 
                  label: "JSON", 
                  desc: language === "id" ? "Array objek terstruktur" : "Array of structured objects" 
                },
                { 
                  id: "markdown", 
                  label: "Markdown", 
                  desc: language === "id" ? "Tabel GitHub / Wiki" : "GitHub / Wiki table" 
                },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id as ExportFormat)}
                  className={`p-2 text-left transition flex flex-col gap-0.5 ${
                    format === fmt.id
                      ? "win-inset font-bold bg-[#0055ea] text-white"
                      : "win-outset bg-[var(--win-surface)] text-[var(--win-text)] hover:bg-blue-50"
                  }`}
                >
                  <span className="text-[11px] font-bold">{fmt.label}</span>
                  <span className={`text-[10px] ${format === fmt.id ? "text-blue-100" : "text-[var(--win-text-muted)]"}`}>{fmt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options (for delimited) */}
          {!["json", "markdown"].includes(format) && (
            <div className="p-2.5 win-inset bg-[var(--win-inset-bg)] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="rounded border-[var(--win-border-dark)]"
                />
                <span>{t.exportModal.includeHeaders}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quoteAll}
                  onChange={(e) => setQuoteAll(e.target.checked)}
                  className="rounded border-[var(--win-border-dark)]"
                />
                <span>{t.exportModal.quoteAll}</span>
              </label>
            </div>
          )}

          {/* Filename input */}
          <div>
            <label className="font-bold block mb-1">{t.exportModal.filenameLabel}</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder={language === "id" ? "nama_file_ekspor" : "export_filename"}
              className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="win-btn text-xs py-1 px-3 flex items-center gap-1"
          >
            {copied ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
            <span>{copied ? t.exportModal.copied : t.exportModal.copyClipboard}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="win-btn win-btn-primary text-xs py-1 px-3 flex items-center gap-1 font-bold"
          >
            <Download size={12} />
            <span>{t.exportModal.downloadFile}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="win-btn text-xs py-1 px-3"
          >
            {t.exportModal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
