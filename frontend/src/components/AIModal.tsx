"use client";

import React, { useState } from "react";
import { Sparkles, ShieldCheck, Loader2, Code, Copy, Check, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { FormattedAIResponse } from "@/components/FormattedAIResponse";
import { useLanguage } from "@/lib/i18n";

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  errorMessage?: string | null;
  schemaContext?: any;
  onApplySQL: (sql: string) => void;
}

export function AIModal({
  isOpen,
  onClose,
  query,
  errorMessage,
  schemaContext,
  onApplySQL,
}: AIModalProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"explain" | "fix" | "generate">("explain");
  const [promptText, setPromptText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [suggestedSQL, setSuggestedSQL] = useState<string | null>(null);
  const [isAllCopied, setIsAllCopied] = useState(false);

  if (!isOpen) return null;

  const extractSQLFromText = (text: string | null | undefined): string | null => {
    if (!text) return null;
    const match = text.match(/```sql\s*([\s\S]*?)\s*```/i);
    return match && match[1] ? match[1].trim() : null;
  };

  const handleExplain = async () => {
    setIsLoading(true);
    setResultText(null);
    setSuggestedSQL(null);
    try {
      const res = await api.aiExplainQuery({
        query: query,
        schema_context: schemaContext,
      });
      const explanation = res.explanation || res.message;
      setResultText(explanation);
      const extracted = extractSQLFromText(explanation);
      if (extracted) {
        setSuggestedSQL(extracted);
      }
    } catch (e: any) {
      setResultText(language === "id" ? `Gagal menganalisis query: ${e.message}` : `Failed to analyze query: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFix = async () => {
    setIsLoading(true);
    setResultText(null);
    setSuggestedSQL(null);
    try {
      const res = await api.aiFixQuery({
        query: query,
        error_message: errorMessage || "Query syntax or execution error",
        schema_context: schemaContext,
      });
      const diagnosisText = res.explanation || res.diagnosis || res.message;
      setResultText(diagnosisText);
      const fixed = res.fixed_sql || res.sql_suggestion || extractSQLFromText(diagnosisText);
      if (fixed) {
        setSuggestedSQL(fixed);
      }
    } catch (e: any) {
      setResultText(language === "id" ? `Gagal mendiagnosa error: ${e.message}` : `Failed to diagnose error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setIsLoading(true);
    setResultText(null);
    setSuggestedSQL(null);
    try {
      const res = await api.aiGenerateQuery({
        prompt: promptText,
        schema_context: schemaContext,
      });
      const generatedExplanation = res.explanation || res.message;
      setResultText(generatedExplanation);
      const sql = res.sql_suggestion || extractSQLFromText(generatedExplanation);
      if (sql) {
        setSuggestedSQL(sql);
      }
    } catch (e: any) {
      setResultText(language === "id" ? `Gagal membuat SQL: ${e.message}` : `Failed to generate SQL: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAllResult = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setIsAllCopied(true);
    setTimeout(() => setIsAllCopied(false), 2000);
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex items-center justify-center p-3 select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-2xl shadow-2xl p-0 flex flex-col max-h-[90vh] bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-300" />
            <span className="font-bold">{t.aiModal.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.aiModal.close}
          >
            ✕
          </button>
        </div>

        {/* Privacy Banner */}
        <div className="win-status-bar px-2 py-1 gap-1.5 text-[11px] border-b border-[var(--win-border-dark)] bg-emerald-50 text-emerald-900">
          <ShieldCheck size={13} className="text-emerald-700 flex-shrink-0" />
          <span>{t.aiModal.privacyBanner}</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)]">
          <button
            onClick={() => {
              setActiveTab("explain");
              setResultText(null);
            }}
            className={`win-tab-item text-xs py-1 px-3 ${activeTab === "explain" ? "active font-bold" : ""}`}
          >
            {t.aiModal.tabExplain}
          </button>
          <button
            onClick={() => {
              setActiveTab("fix");
              setResultText(null);
            }}
            className={`win-tab-item text-xs py-1 px-3 ${activeTab === "fix" ? "active font-bold" : ""}`}
          >
            {t.aiModal.tabFix}
          </button>
          <button
            onClick={() => {
              setActiveTab("generate");
              setResultText(null);
            }}
            className={`win-tab-item text-xs py-1 px-3 ${activeTab === "generate" ? "active font-bold" : ""}`}
          >
            {t.aiModal.tabGenerate}
          </button>
        </div>

        {/* Body */}
        <div className="p-3 overflow-y-auto space-y-3 text-xs flex-1">
          {activeTab === "explain" && (
            <div className="space-y-2">
              <p className="text-[var(--win-text-muted)]">{t.aiModal.explainDesc}</p>
              <pre className="win-inset p-2.5 font-mono text-[11px] max-h-32 overflow-x-auto whitespace-pre-wrap select-text bg-[var(--win-inset-bg)] text-[var(--win-text)]">
                {query || `-- ${t.aiModal.emptyEditor}`}
              </pre>
              <button
                onClick={handleExplain}
                disabled={isLoading || !query.trim()}
                className="win-btn win-btn-primary w-full py-1.5 flex items-center justify-center gap-1.5 font-bold"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{t.aiModal.btnExplain}</span>
              </button>
            </div>
          )}

          {activeTab === "fix" && (
            <div className="space-y-2">
              <p className="text-[var(--win-text-muted)]">{t.aiModal.fixDesc}</p>
              {errorMessage && (
                <div className="win-inset p-2 bg-rose-50 border border-rose-400 text-rose-900 font-mono text-[11px] select-text">
                  {errorMessage}
                </div>
              )}
              <pre className="win-inset p-2.5 font-mono text-[11px] max-h-24 overflow-x-auto whitespace-pre-wrap select-text bg-[var(--win-inset-bg)] text-[var(--win-text)]">
                {query || `-- ${t.aiModal.emptyEditor}`}
              </pre>
              <button
                onClick={handleFix}
                disabled={isLoading}
                className="win-btn text-rose-700 w-full py-1.5 flex items-center justify-center gap-1.5 font-bold"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{t.aiModal.btnFix}</span>
              </button>
            </div>
          )}

          {activeTab === "generate" && (
            <div className="space-y-2">
              <p className="text-[var(--win-text-muted)]">{t.aiModal.generateDesc}</p>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={t.aiModal.generatePlaceholder}
                className="win-inset w-full p-2 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none resize-none h-20"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !promptText.trim()}
                className="win-btn win-btn-primary w-full py-1.5 flex items-center justify-center gap-1.5 font-bold"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>{t.aiModal.btnGenerate}</span>
              </button>
            </div>
          )}

          {/* Result Output (Formatted Clean UI) */}
          {resultText && (
            <div className="win-inset p-3 space-y-2.5 bg-[var(--win-inset-bg)] text-[var(--win-text)]">
              {/* Header result bar */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--win-border-dark)]">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span className="font-bold text-xs">{t.aiModal.analysisResult}</span>
                </div>
                <button
                  onClick={handleCopyAllResult}
                  className="win-btn text-[10px] py-0.5 px-2 flex items-center gap-1"
                  title={t.aiModal.copyAll}
                >
                  {isAllCopied ? (
                    <>
                      <Check size={11} className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">{t.aiModal.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>{t.aiModal.copyAll}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formatted Markdown Content */}
              <FormattedAIResponse
                content={resultText}
                onApplySQL={(sql) => {
                  onApplySQL(sql);
                  onClose();
                }}
              />

              {/* Suggested SQL Action Banner */}
              {suggestedSQL && (
                <div className="pt-2 border-t border-[var(--win-border-dark)] flex items-center justify-between bg-[var(--win-surface)] p-2 win-outset">
                  <div className="flex items-center gap-1.5">
                    <Code size={13} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-[11px] font-bold text-[var(--win-text)]">{t.aiModal.detectedQuery}</span>
                  </div>
                  <button
                    onClick={() => {
                      onApplySQL(suggestedSQL);
                      onClose();
                    }}
                    className="win-btn win-btn-primary font-bold text-xs flex items-center gap-1.5 py-1 px-3"
                  >
                    <span>{t.aiModal.applyEditor}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.aiModal.close}
          </button>
        </div>
      </div>
    </div>
  );
}
