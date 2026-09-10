"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  History, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  Clock, 
  Hash, 
  CheckCircle2, 
  XCircle, 
  GitCompare
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface HistoryDrawerProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onLoadSQL: (sql: string) => void;
  onCompareQueries?: (runA: any, runB: any) => void;
}

export function HistoryDrawer({
  isOpen,
  workspaceId,
  onClose,
  onLoadSQL,
  onCompareQueries,
}: HistoryDrawerProps) {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [retentionMax, setRetentionMax] = useState<number>(100);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "ERROR">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);

  const loadHistory = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await api.getQueryHistory(workspaceId, search, statusFilter);
      setHistory(res.history || []);
      if (res.retention_max) setRetentionMax(res.retention_max);
    } catch {
      // History load failed; drawer shows empty state
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, search, statusFilter]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSelectedForDiff([]);
    }
  }, [isOpen, loadHistory]);

  const handleDelete = async (id: string) => {
    const prevHistory = [...history];
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setSelectedForDiff((prev) => prev.filter((item) => item !== id));
    try {
      await api.deleteQueryHistory(id);
    } catch {
      setHistory(prevHistory);
    }
  };

  const handleCleanup = async (options: { clear_all?: boolean; days?: number }) => {
    try {
      setIsLoading(true);
      const res = await api.cleanupHistory(workspaceId, options);
      setConfirmClearAll(false);
      setSelectedForDiff([]);
      setActionMessage(res.message || `${res.deleted_count} riwayat berhasil dibersihkan`);
      setTimeout(() => setActionMessage(null), 3000);
      await loadHistory();
    } catch (e: any) {
      alert(e.message || "Gagal membersihkan riwayat");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectForDiff = (id: string) => {
    setSelectedForDiff((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const triggerDiff = () => {
    if (selectedForDiff.length === 2 && onCompareQueries) {
      const runA = history.find((h) => h.id === selectedForDiff[0]);
      const runB = history.find((h) => h.id === selectedForDiff[1]);
      if (runA && runB) {
        onCompareQueries(runA, runB);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex justify-end select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-lg h-full flex flex-col shadow-2xl p-0 border-y-0 border-r-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <History size={14} className="text-amber-300" />
            <span className="font-bold">{t.history.title} ({history.length})</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.history.close}
          >
            ✕
          </button>
        </div>

        {/* Sub-banner: Retention Info */}
        <div className="win-status-bar px-2 py-1 justify-between text-xs border-b border-[var(--win-border-dark)]">
          <span>
            {language === "id"
              ? `Auto-retention: Maksimal ${retentionMax} query per workspace`
              : `Auto-retention: Max ${retentionMax} queries per workspace`}
          </span>
          <span className="font-mono text-[10px]">
            {history.length} {language === "id" ? "tersimpan" : "saved"}
          </span>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="px-3 py-1.5 bg-emerald-100 border-b border-emerald-500 text-emerald-900 text-xs flex items-center gap-2 font-bold">
            <CheckCircle2 size={13} className="text-emerald-700" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Diff Action Floating Banner */}
        {selectedForDiff.length > 0 && (
          <div className="p-2 bg-indigo-50 border-b border-indigo-300 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-1.5">
              <GitCompare size={13} className="text-indigo-700" />
              <span className="font-semibold">
                {selectedForDiff.length === 1 
                  ? (language === "id" ? "Pilih 1 query lagi untuk membandingkan" : "Select 1 more query to compare")
                  : (language === "id" ? "2 query dipilih untuk dikomparasi" : "2 queries selected for comparison")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {selectedForDiff.length === 2 && (
                <button
                  onClick={triggerDiff}
                  className="win-btn win-btn-primary text-xs font-bold flex items-center gap-1"
                >
                  <GitCompare size={12} />
                  <span>{language === "id" ? "Bandingkan Diff" : "Compare Diff"}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedForDiff([])}
                className="win-btn text-[10px]"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Controls: Search, Filter, Cleanup */}
        <div className="p-2 border-b border-[var(--win-border-dark)] space-y-2 bg-[var(--win-surface)]">
          {/* Search Bar */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-[var(--win-text-muted)]" />
            <input
              type="text"
              placeholder={t.history.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="win-inset w-full pl-6 pr-2 py-1 text-xs text-[var(--win-text)] focus:outline-none"
            />
          </div>

          {/* Filter & Cleanup Buttons */}
          <div className="flex items-center justify-between gap-1 flex-wrap text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`win-btn text-[10px] ${statusFilter === "ALL" ? "win-inset font-bold" : ""}`}
              >
                {t.history.filterAll}
              </button>
              <button
                onClick={() => setStatusFilter("SUCCESS")}
                className={`win-btn text-[10px] ${statusFilter === "SUCCESS" ? "win-inset font-bold text-emerald-700" : ""}`}
              >
                {t.history.filterSuccess}
              </button>
              <button
                onClick={() => setStatusFilter("ERROR")}
                className={`win-btn text-[10px] ${statusFilter === "ERROR" ? "win-inset font-bold text-rose-700" : ""}`}
              >
                {t.history.filterError}
              </button>
            </div>

            {/* Quick Cleanup Actions */}
            <div className="flex items-center gap-1">
              {confirmClearAll ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCleanup({ clear_all: true })}
                    className="win-btn text-[10px] bg-rose-600 text-white font-bold"
                  >
                    {t.history.clearConfirm}
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="win-btn text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  title="Clear history"
                  className="win-btn text-[10px] text-rose-600 font-bold"
                >
                  <Trash2 size={11} />
                  <span>{t.history.clearAll}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List of History (Sunken Container) */}
        <div className="flex-1 overflow-y-auto win-inset m-1 p-1.5 space-y-1.5 bg-[var(--win-inset-bg)]">
          {isLoading && history.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--win-text-muted)] flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>{language === "id" ? "Memuat riwayat query..." : "Loading query history..."}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--win-text-muted)] space-y-1">
              <p className="font-bold">{t.history.empty}</p>
            </div>
          ) : (
            history.map((h) => {
              const isSelected = selectedForDiff.includes(h.id);
              const selectOrder = selectedForDiff.indexOf(h.id);

              return (
                <div
                  key={h.id}
                  className={`win-outset p-2 text-xs space-y-1.5 ${
                    isSelected ? "ring-2 ring-indigo-500 bg-indigo-50/60" : "bg-[var(--win-surface)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Checkbox for Diff Selection */}
                      <button
                        onClick={() => toggleSelectForDiff(h.id)}
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] font-bold ${
                          isSelected
                            ? "bg-[#0055ea] border-blue-700 text-white"
                            : "border-[var(--win-border-dark)] bg-[var(--win-inset-bg)] text-transparent hover:border-blue-600"
                        }`}
                        title={
                          isSelected
                            ? (language === "id" ? "Batalkan pilihan komparasi" : "Deselect comparison")
                            : (language === "id" ? "Pilih untuk perbandingan diff" : "Select for diff comparison")
                        }
                      >
                        {isSelected ? (selectOrder === 0 ? "A" : "B") : "✓"}
                      </button>

                      {h.status === "SUCCESS" ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-bold">
                          <CheckCircle2 size={11} />
                          SUCCESS
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center gap-1 font-bold">
                          <XCircle size={11} />
                          ERROR
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-[var(--win-text-muted)]">
                        <Clock size={11} />
                        {h.duration_ms}ms
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-[var(--win-text-muted)]">
                        <Hash size={11} />
                        {h.row_count ?? 0} {t.history.rows}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(h.id)}
                      title="Delete"
                      className="win-btn !p-0.5 !w-5 !h-5 text-rose-600"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <pre className="win-inset p-2 font-mono text-[11px] max-h-24 overflow-x-auto whitespace-pre-wrap select-text bg-[var(--win-inset-bg)] text-[var(--win-text)]">
                    {h.query_text}
                  </pre>

                  {h.error_message && (
                    <div className="win-inset p-1.5 text-[10px] text-rose-700 font-mono bg-rose-50 border border-rose-400 select-text">
                      {h.error_message}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[var(--win-text-muted)] font-mono">
                      {h.executed_at ? new Date(h.executed_at).toLocaleString() : ""}
                    </span>
                    <button
                      onClick={() => {
                        onLoadSQL(h.query_text);
                        onClose();
                      }}
                      className="win-btn text-[11px] font-bold text-blue-700"
                    >
                      <span>{t.history.loadToEditor}</span>
                      <ArrowUpRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
