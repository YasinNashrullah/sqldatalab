"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Table, 
  Hash, 
  Eye, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowUpRight,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface TableStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  tableName: string;
  onInsertSQL?: (sql: string) => void;
}

export const TableStatsModal: React.FC<TableStatsModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  tableName,
  onInsertSQL,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"structure" | "quality">("structure");
  const [loading, setLoading] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [qualityProfile, setQualityProfile] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCleanSQL, setCopiedCleanSQL] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.getTableStats(workspaceId, tableName);
      setStats(res);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal memuat statistik tabel." : "Failed to load table statistics."));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, tableName, language]);

  const loadQualityProfile = useCallback(async () => {
    try {
      setQualityLoading(true);
      const res = await api.getDataQualityProfile(workspaceId, tableName);
      setQualityProfile(res);
    } catch (err: any) {
      console.error("Failed to load quality profile:", err);
    } finally {
      setQualityLoading(false);
    }
  }, [workspaceId, tableName]);

  useEffect(() => {
    if (isOpen && tableName && workspaceId) {
      loadStats();
      loadQualityProfile();
    }
  }, [isOpen, tableName, workspaceId, loadStats, loadQualityProfile]);

  const handleCopyCleanSQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedCleanSQL(true);
    setTimeout(() => setCopiedCleanSQL(false), 2000);
  };

  const handleApplyCleanSQL = (sql: string) => {
    if (onInsertSQL) {
      onInsertSQL(sql);
      onClose();
    }
  };

  if (!isOpen) return null;

  const score = qualityProfile?.quality_score ?? 100;
  const grade = qualityProfile?.quality_grade ?? "A";
  const gradeColors = {
    A: "bg-emerald-100 text-emerald-900 border-emerald-400",
    B: "bg-blue-100 text-blue-900 border-blue-400",
    C: "bg-amber-100 text-amber-900 border-amber-400",
    D: "bg-rose-100 text-rose-900 border-rose-400",
  }[grade as "A" | "B" | "C" | "D"] || "bg-emerald-100 text-emerald-900 border-emerald-400";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[0.5px] animate-fadeIn p-3 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl p-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Table size={14} className="text-amber-300" />
            <span className="font-bold">{t.dataQuality.title} ({tableName})</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.dataQuality.close}
          >
            ✕
          </button>
        </div>

        {/* Table Summary Strip */}
        <div className="p-3 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 win-inset flex items-center justify-center bg-[#0055ea] text-white">
              <Table size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[var(--win-text)]">{tableName}</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase bg-[var(--win-surface)] text-[var(--win-text)] border border-[var(--win-border-dark)]">
                  {t.dataQuality.catalog}
                </span>
                {qualityProfile && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold uppercase border ${gradeColors}`}>
                    Grade {grade} ({score}/100)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--win-text-muted)] mt-0.5 font-mono">
                {stats ? t.dataQuality.summary(stats.total_rows || 0, stats.columns?.length || 0) : t.dataQuality.loadingSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)]">
          <button
            onClick={() => setActiveTab("structure")}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-3 ${activeTab === "structure" ? "active font-bold" : ""}`}
          >
            <Hash size={13} />
            <span>{t.dataQuality.tabStructure}</span>
          </button>
          <button
            onClick={() => setActiveTab("quality")}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-3 ${activeTab === "quality" ? "active font-bold" : ""}`}
          >
            <ShieldCheck size={13} />
            <span>{t.dataQuality.tabQuality}</span>
            {qualityProfile?.issues?.length > 0 && (
              <span className="ml-1 px-1 text-[9px] bg-amber-500 text-black font-bold">
                {qualityProfile.issues.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto m-2 p-3 win-inset bg-[var(--win-inset-bg)] text-[var(--win-text)] space-y-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-[var(--win-text-muted)] gap-2">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">{t.dataQuality.loadingAnalyzing}</p>
            </div>
          ) : errorMsg ? (
            <div className="p-3 win-inset bg-rose-50 border border-rose-400 text-rose-900 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : activeTab === "structure" ? (
            <>
              {/* Column Details Table */}
              <div>
                <h4 className="text-xs font-bold text-[var(--win-text)] mb-2 flex items-center gap-1.5">
                  <Hash size={13} className="text-blue-700" />
                  <span>{t.dataQuality.colStructureTitle}</span>
                </h4>
                <div className="win-inset overflow-hidden bg-[var(--win-inset-bg)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--win-border-medium)] bg-[var(--win-surface)] text-[var(--win-text)] font-bold text-[11px]">
                        <th className="p-2">{t.dataQuality.colName}</th>
                        <th className="p-2">{t.dataQuality.dataType}</th>
                        <th className="p-2 text-right">{t.dataQuality.distinctVals}</th>
                        <th className="p-2 text-right">{t.dataQuality.nullCount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--win-border-medium)] text-[var(--win-text)] font-mono text-[11px]">
                      {stats?.columns?.map((col: any) => (
                        <tr key={col.name} className="hover:bg-blue-50 transition">
                          <td className="p-2 font-bold">{col.name}</td>
                          <td className="p-2 text-blue-700">{col.type}</td>
                          <td className="p-2 text-right">
                            {col.distinct_count !== null ? col.distinct_count.toLocaleString("id-ID") : "—"}
                          </td>
                          <td className="p-2 text-right">
                            <span className={col.null_count > 0 ? "text-amber-700 font-bold" : "text-[var(--win-text-muted)]"}>
                              {col.null_count || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Rows Preview */}
              {stats?.sample_rows && stats.sample_rows.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[var(--win-text)] mb-2 flex items-center gap-1.5">
                    <Eye size={13} className="text-blue-700" />
                    <span>{t.dataQuality.sampleTitle}</span>
                  </h4>
                  <div className="win-inset overflow-x-auto max-h-52 bg-[var(--win-inset-bg)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--win-border-medium)] bg-[var(--win-surface)] text-[var(--win-text)] font-bold text-[11px] sticky top-0">
                          {stats.sample_columns?.map((c: any) => (
                            <th key={c.name} className="p-2 whitespace-nowrap">{c.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--win-border-medium)] text-[var(--win-text)] font-mono text-[11px]">
                        {stats.sample_rows.map((row: any[], rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-blue-50">
                            {row.map((val: any, cIdx: number) => (
                              <td key={cIdx} className="p-2 whitespace-nowrap">
                                {val !== null && val !== undefined ? String(val) : <span className="text-[var(--win-text-muted)] italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Quality & Anomalies Tab */
            <div className="space-y-4">
              {qualityLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-[var(--win-text-muted)] gap-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">{language === "id" ? "Mengaudit kualitas & anomali data..." : "Auditing data quality & anomalies..."}</p>
                </div>
              ) : qualityProfile ? (
                <>
                  {/* Quality Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                      <div className="text-[11px] text-[var(--win-text-muted)] font-bold">Quality Score</div>
                      <div className="text-lg font-bold mt-1 flex items-baseline gap-1 font-mono text-[var(--win-text)]">
                        {qualityProfile.quality_score}
                        <span className="text-xs text-[var(--win-text-muted)] font-normal">/ 100</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-0.5">Grade {qualityProfile.quality_grade}</div>
                    </div>
                    <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                      <div className="text-[11px] text-[var(--win-text-muted)] font-bold">{language === "id" ? "Baris Duplikat" : "Duplicate Rows"}</div>
                      <div className="text-lg font-bold text-[var(--win-text)] mt-1 font-mono">
                        {qualityProfile.duplicate_rows}
                      </div>
                      <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                        {qualityProfile.duplicate_percentage}% {language === "id" ? "dari data" : "of total"}
                      </div>
                    </div>
                    <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                      <div className="text-[11px] text-[var(--win-text-muted)] font-bold">{language === "id" ? "Total Kolom" : "Total Columns"}</div>
                      <div className="text-lg font-bold text-[var(--win-text)] mt-1 font-mono">
                        {qualityProfile.total_columns}
                      </div>
                      <div className="text-[10px] text-blue-700 mt-0.5">
                        {qualityProfile.columns?.filter((c: any) => c.null_count === 0).length} {language === "id" ? "Kolom Bersih" : "Clean Columns"}
                      </div>
                    </div>
                    <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                      <div className="text-[11px] text-[var(--win-text-muted)] font-bold">{language === "id" ? "Anomali & Isu" : "Anomalies & Issues"}</div>
                      <div className="text-lg font-bold text-[var(--win-text)] mt-1 font-mono">
                        {qualityProfile.issues?.length || 0}
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">{language === "id" ? "Diagnostik Terdeteksi" : "Diagnostics Found"}</div>
                    </div>
                  </div>

                  {/* Issues & Warnings */}
                  {qualityProfile.issues && qualityProfile.issues.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-[var(--win-text)] mb-2 flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-amber-600" />
                        <span>{language === "id" ? "Diagnostik Kualitas & Potensi Masalah" : "Quality Diagnostics & Issues"}</span>
                      </h4>
                      <div className="space-y-1.5">
                        {qualityProfile.issues.map((iss: any, idx: number) => {
                          const badge = {
                            CRITICAL: "bg-rose-100 text-rose-900 border-rose-400",
                            WARNING: "bg-amber-100 text-amber-900 border-amber-400",
                            INFO: "bg-blue-100 text-blue-900 border-blue-400",
                          }[iss.severity as "CRITICAL" | "WARNING" | "INFO"] || "bg-gray-100 text-gray-900 border-gray-400";

                          return (
                            <div
                              key={idx}
                              className="p-2.5 win-inset bg-[var(--win-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-start gap-2">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase border shrink-0 ${badge}`}>
                                  {iss.severity}
                                </span>
                                <div>
                                  <div className="font-bold text-[var(--win-text)]">{iss.message}</div>
                                  {iss.suggested_action && (
                                    <div className="text-[11px] text-[var(--win-text-muted)] mt-0.5 flex items-center gap-1">
                                      <Sparkles size={11} className="text-blue-700 shrink-0" />
                                      <span>{iss.suggested_action}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Column Quality Matrix */}
                  <div>
                    <h4 className="text-xs font-bold text-[var(--win-text)] mb-2 flex items-center gap-1.5">
                      <Layers size={13} className="text-blue-700" />
                      <span>{language === "id" ? "Matriks Kualitas per Kolom (Outlier & Missing)" : "Column Quality Matrix (Outliers & Missing)"}</span>
                    </h4>
                    <div className="win-inset overflow-x-auto bg-[var(--win-inset-bg)]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--win-border-medium)] bg-[var(--win-surface)] text-[var(--win-text)] font-bold text-[11px]">
                            <th className="p-2">{language === "id" ? "Kolom" : "Column"}</th>
                            <th className="p-2">{language === "id" ? "Status Rasio NULL" : "NULL Ratio Status"}</th>
                            <th className="p-2">{language === "id" ? "Kardinalitas" : "Cardinality"}</th>
                            <th className="p-2">{language === "id" ? "Distribusi Numerik (Min / Avg / Max)" : "Numeric Distribution (Min / Avg / Max)"}</th>
                            <th className="p-2 text-right">Outliers (IQR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--win-border-medium)] text-[var(--win-text)] font-mono text-[11px]">
                          {qualityProfile.columns?.map((col: any) => (
                            <tr key={col.name} className="hover:bg-blue-50">
                              <td className="p-2 font-bold flex items-center gap-1.5">
                                <span>{col.name}</span>
                                {col.is_candidate_pk && (
                                  <span className="px-1 py-0.2 bg-emerald-100 text-emerald-900 text-[9px] font-bold border border-emerald-400">
                                    PK Candidate
                                  </span>
                                )}
                                {col.is_constant && (
                                  <span className="px-1 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-400">
                                    Constant
                                  </span>
                                )}
                              </td>
                              <td className="p-2">
                                <span className={col.null_count > 0 ? "text-amber-700 font-bold" : "text-emerald-700"}>
                                  {col.null_count} {language === "id" ? "baris" : "rows"} ({col.null_percentage}%)
                                </span>
                              </td>
                              <td className="p-2 text-[var(--win-text-muted)]">
                                {col.distinct_count !== null ? `${col.distinct_count} ${language === "id" ? "unik" : "unique"}` : "—"}
                              </td>
                              <td className="p-2">
                                {col.numeric_distribution ? (
                                  <span className="text-[11px]">
                                    {col.numeric_distribution.min_val} / {col.numeric_distribution.avg_val} / {col.numeric_distribution.max_val}
                                  </span>
                                ) : (
                                  <span className="text-[var(--win-text-muted)]">—</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {col.numeric_distribution?.outliers_count ? (
                                  <span className="px-1 py-0.5 bg-rose-100 text-rose-900 font-bold border border-rose-400 text-[10px]">
                                    {col.numeric_distribution.outliers_count} {language === "id" ? "pencilan" : "outliers"}
                                  </span>
                                ) : (
                                  <span className="text-[var(--win-text-muted)]">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Clean SQL Remediation */}
                  {qualityProfile.clean_sql_snippet && (
                    <div className="p-2.5 win-outset bg-[var(--win-surface)] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                          <Sparkles size={13} />
                          <span>{t.dataQuality.remediateBtn}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyCleanSQL(qualityProfile.clean_sql_snippet)}
                            className="win-btn text-xs"
                          >
                            {copiedCleanSQL ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                            <span>{copiedCleanSQL ? t.dataQuality.copied : t.dataQuality.copySql}</span>
                          </button>
                          {onInsertSQL && (
                            <button
                              onClick={() => handleApplyCleanSQL(qualityProfile.clean_sql_snippet)}
                              className="win-btn win-btn-primary text-xs font-bold"
                            >
                              <ArrowUpRight size={12} />
                              <span>{t.dataQuality.applySql}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="win-inset p-2.5 text-xs font-mono text-[var(--win-text)] bg-[var(--win-inset-bg)] overflow-x-auto whitespace-pre-wrap select-text">
                        {qualityProfile.clean_sql_snippet}
                      </pre>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.dataQuality.close}
          </button>
        </div>
      </div>
    </div>
  );
};
