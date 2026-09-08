"use client";

import React, { useState } from "react";
import { 
  GitCompare, 
  Clock, 
  Database, 
  Zap, 
  ArrowRight, 
  Copy, 
  Check, 
  ArrowUpRight 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export interface QueryRunInfo {
  query_text: string;
  duration_ms: number;
  row_count: number;
  status: string;
  executed_at?: string;
  label?: string;
}

interface QueryDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  runA: any;
  runB: any;
  onLoadSQL?: (sql: string) => void;
}

export const QueryDiffModal: React.FC<QueryDiffModalProps> = ({
  isOpen,
  onClose,
  runA,
  runB,
  onLoadSQL,
}) => {
  const { t, language } = useLanguage();
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  if (!isOpen || !runA || !runB) return null;

  const handleCopy = (text: string, isA: boolean) => {
    navigator.clipboard.writeText(text);
    if (isA) {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 2000);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 2000);
    }
  };

  // Performance metrics calculation
  const durA = runA.duration_ms ?? 0;
  const durB = runB.duration_ms ?? 0;
  const durDelta = durB - durA;
  const durPct = durA > 0 ? Math.round((durDelta / durA) * 100) : 0;

  const rowsA = runA.row_count ?? 0;
  const rowsB = runB.row_count ?? 0;
  const rowsDelta = rowsB - rowsA;

  // Simple line-by-line diff
  const linesA = (runA.query_text || "").split("\n");
  const linesB = (runB.query_text || "").split("\n");
  const maxLines = Math.max(linesA.length, linesB.length);

  const diffPairs: { lineA: string | null; lineB: string | null; status: "same" | "modified" | "added" | "removed" }[] = [];
  for (let i = 0; i < maxLines; i++) {
    const a = linesA[i] !== undefined ? linesA[i] : null;
    const b = linesB[i] !== undefined ? linesB[i] : null;
    let status: "same" | "modified" | "added" | "removed" = "same";

    if (a === null && b !== null) status = "added";
    else if (a !== null && b === null) status = "removed";
    else if (a !== b) status = "modified";

    diffPairs.push({ lineA: a, lineB: b, status });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[0.5px] animate-fadeIn p-3 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-5xl flex flex-col shadow-2xl p-0 max-h-[90vh] bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <GitCompare size={14} className="text-amber-300" />
            <span className="font-bold">{t.queryDiff.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.queryDiff.close}
          >
            ✕
          </button>
        </div>

        {/* Comparison KPI Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)]">
          {/* Runtime Duration Delta */}
          <div className="win-outset p-2 bg-[var(--win-surface)] text-xs">
            <div className="text-[11px] text-[var(--win-text-muted)] flex items-center gap-1 font-bold">
              <Clock size={12} className="text-blue-700" />
              <span>{t.queryDiff.duration}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-xs text-[var(--win-text-muted)]">{durA}ms</span>
              <ArrowRight size={11} className="text-[var(--win-text-muted)]" />
              <span className="text-sm font-bold text-[var(--win-text)]">{durB}ms</span>
            </div>
            <div className="mt-1">
              {durDelta < 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-400 inline-flex items-center gap-0.5">
                  <Zap size={10} />
                  <span>{t.queryDiff.faster(Math.abs(durPct), Math.abs(durDelta))}</span>
                </span>
              ) : durDelta > 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-400 inline-flex items-center gap-0.5">
                  <span>{t.queryDiff.slower(durPct, durDelta)}</span>
                </span>
              ) : (
                <span className="text-[10px] text-[var(--win-text-muted)]">{t.queryDiff.identicalDur}</span>
              )}
            </div>
          </div>

          {/* Row Count Delta */}
          <div className="win-outset p-2 bg-[var(--win-surface)] text-xs">
            <div className="text-[11px] text-[var(--win-text-muted)] flex items-center gap-1 font-bold">
              <Database size={12} className="text-blue-700" />
              <span>{t.queryDiff.rowCount}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-xs text-[var(--win-text-muted)]">{rowsA}</span>
              <ArrowRight size={11} className="text-[var(--win-text-muted)]" />
              <span className="text-sm font-bold text-[var(--win-text)]">{rowsB}</span>
            </div>
            <div className="mt-1 text-[10px] font-mono">
              {rowsDelta !== 0 ? (
                <span className="text-blue-700 font-bold">
                  {t.queryDiff.rowsDelta(rowsDelta)}
                </span>
              ) : (
                <span className="text-[var(--win-text-muted)]">{t.queryDiff.identicalRows(rowsA)}</span>
              )}
            </div>
          </div>

          {/* Status & Timing */}
          <div className="win-outset p-2 bg-[var(--win-surface)] text-xs">
            <div className="text-[11px] text-[var(--win-text-muted)] font-bold">{t.queryDiff.status}</div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
              <span className={`px-1.5 py-0.5 font-bold border ${
                runA.status === "SUCCESS" ? "bg-emerald-100 text-emerald-900 border-emerald-400" : "bg-rose-100 text-rose-900 border-rose-400"
              }`}>
                A: {runA.status || "OK"}
              </span>
              <ArrowRight size={11} className="text-[var(--win-text-muted)]" />
              <span className={`px-1.5 py-0.5 font-bold border ${
                runB.status === "SUCCESS" ? "bg-emerald-100 text-emerald-900 border-emerald-400" : "bg-rose-100 text-rose-900 border-rose-400"
              }`}>
                B: {runB.status || "OK"}
              </span>
            </div>
            <div className="text-[10px] text-[var(--win-text-muted)] mt-1 truncate">
              {runB.executed_at ? t.queryDiff.completedAt(new Date(runB.executed_at).toLocaleTimeString()) : "OK"}
            </div>
          </div>
        </div>

        {/* Side-by-side SQL Diff View */}
        <div className="flex-1 overflow-y-auto m-2 p-2 win-inset bg-[var(--win-inset-bg)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Query A Panel */}
            <div className="win-window shadow-none flex flex-col">
              <div className="win-titlebar text-xs py-1 px-2 flex items-center justify-between">
                <span className="font-bold truncate">A: {runA.label || (language === "id" ? "Query Run A (Basis)" : "Query Run A (Baseline)")}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(runA.query_text, true)}
                    className="win-control-btn text-[10px]"
                    title={language === "id" ? "Salin SQL A" : "Copy SQL A"}
                  >
                    {copiedA ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  {onLoadSQL && (
                    <button
                      onClick={() => {
                        onLoadSQL(runA.query_text);
                        onClose();
                      }}
                      className="win-btn text-[10px] font-bold text-blue-700 py-0.2 px-1"
                    >
                      <ArrowUpRight size={10} />
                      <span>{t.queryDiff.load}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2 font-mono text-[11px] overflow-x-auto space-y-0.5 flex-1 max-h-72 bg-[var(--win-inset-bg)] text-[var(--win-text)] select-text">
                {diffPairs.map((pair, idx) => {
                  const isMod = pair.status === "modified" || pair.status === "removed";
                  return (
                    <div
                      key={idx}
                      className={`px-1 py-0.2 whitespace-pre ${
                        isMod ? "bg-rose-100 text-rose-900 border-l-2 border-rose-600 font-bold" : ""
                      }`}
                    >
                      {pair.lineA !== null ? pair.lineA : <span className="opacity-0">—</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Query B Panel */}
            <div className="win-window shadow-none flex flex-col">
              <div className="win-titlebar text-xs py-1 px-2 flex items-center justify-between">
                <span className="font-bold truncate">B: {runB.label || (language === "id" ? "Query Run B (Pembanding)" : "Query Run B (Comparison)")}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(runB.query_text, false)}
                    className="win-control-btn text-[10px]"
                    title={language === "id" ? "Salin SQL B" : "Copy SQL B"}
                  >
                    {copiedB ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  {onLoadSQL && (
                    <button
                      onClick={() => {
                        onLoadSQL(runB.query_text);
                        onClose();
                      }}
                      className="win-btn win-btn-primary text-[10px] font-bold py-0.2 px-1"
                    >
                      <ArrowUpRight size={10} />
                      <span>{t.queryDiff.load}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2 font-mono text-[11px] overflow-x-auto space-y-0.5 flex-1 max-h-72 bg-[var(--win-inset-bg)] text-[var(--win-text)] select-text">
                {diffPairs.map((pair, idx) => {
                  const isAdd = pair.status === "added" || pair.status === "modified";
                  return (
                    <div
                      key={idx}
                      className={`px-1 py-0.2 whitespace-pre ${
                        isAdd ? "bg-emerald-100 text-emerald-900 border-l-2 border-emerald-600 font-bold" : ""
                      }`}
                    >
                      {pair.lineB !== null ? pair.lineB : <span className="opacity-0">—</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.queryDiff.close}
          </button>
        </div>
      </div>
    </div>
  );
};
