"use client";

import React, { useState, useEffect } from "react";
import { Network, Clock, Cpu, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface QueryExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  query: string;
}

export const QueryExplainModal: React.FC<QueryExplainModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  query,
}) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const runExplain = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.explainSQL({ workspace_id: workspaceId, query: query.trim() });
      setPlanData(res);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal menjalankan EXPLAIN." : "Failed to execute EXPLAIN query."));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, query, language]);

  useEffect(() => {
    if (isOpen && query.trim() && workspaceId) {
      runExplain();
    }
  }, [isOpen, query, workspaceId, runExplain]);

  if (!isOpen) return null;

  // Extract operators
  const planText = planData?.plan || "";
  const operators: string[] = [];
  const knownOperators = [
    "SEQ_SCAN", "INDEX_SCAN", "FILTER", "PROJECTION", "HASH_GROUP_BY",
    "PERFECT_HASH_GROUP_BY", "ORDER_BY", "LIMIT", "HASH_JOIN", "PIECEWISE_MERGE_JOIN",
    "CROSS_PRODUCT", "WINDOW", "AGGREGATE"
  ];
  for (const op of knownOperators) {
    if (planText.toUpperCase().includes(op)) {
      operators.push(op);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[0.5px] animate-fadeIn p-3 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-2xl flex flex-col shadow-2xl p-0 max-h-[85vh] bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Network size={14} className="text-amber-300" />
            <span className="font-bold">{t.explainModal.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.explainModal.close}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[var(--win-text-muted)] gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">{t.explainModal.analyzing}</p>
            </div>
          ) : errorMsg ? (
            <div className="p-3 win-inset bg-rose-50 border border-rose-400 text-rose-900 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : planData ? (
            <div className="space-y-3">
              {/* Timing & Operators */}
              <div className="flex flex-wrap items-center gap-1.5 font-sans">
                <div className="win-status-panel text-xs flex items-center gap-1">
                  <Clock size={12} className="text-blue-700" />
                  <span>
                    {language === "id" ? "Waktu Perencanaan:" : "Planning Time:"}{" "}
                    <strong className="font-mono">{planData.duration_ms} ms</strong>
                  </span>
                </div>
                {operators.map((op) => (
                  <span
                    key={op}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-400"
                  >
                    {op}
                  </span>
                ))}
              </div>

              {/* Execution Tree (Sunken Monospace View) */}
              <div className="win-inset p-3 bg-[var(--win-inset-bg)] text-[var(--win-text)] overflow-x-auto text-[11px] leading-relaxed select-text">
                <pre className="font-mono whitespace-pre">
                  {planData.plan || (language === "id" ? "Tidak ada plan yang dihasilkan." : "No plan output generated.")}
                </pre>
              </div>

              {/* Educational Note */}
              <div className="win-inset p-2.5 bg-[var(--win-surface)] text-[11px] text-[var(--win-text)] space-y-1">
                <strong className="text-blue-700 flex items-center gap-1 font-bold">
                  <Cpu size={12} />
                  <span>{language === "id" ? "Tips Optimasi Analitik:" : "Analytical Optimization Tips:"}</span>
                </strong>
                <p className="text-[var(--win-text-muted)] leading-relaxed">
                  {language === "id" ? (
                    <>
                      DuckDB mengeksekusi query secara vectorized in-memory. Jika terdapat operator{" "}
                      <code className="font-mono font-bold text-amber-700">SEQ_SCAN</code> pada tabel besar, gunakan klausul{" "}
                      <code className="font-mono font-bold text-blue-700">WHERE</code> sedini mungkin untuk meminimalkan pembacaan data.
                    </>
                  ) : (
                    <>
                      DuckDB executes queries vectorized in-memory. If a{" "}
                      <code className="font-mono font-bold text-amber-700">SEQ_SCAN</code> operator appears on large tables, apply{" "}
                      <code className="font-mono font-bold text-blue-700">WHERE</code> clauses early to minimize scan volume.
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.explainModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
