"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Trophy, 
  CheckCircle, 
  ChevronRight, 
  Play, 
  Lightbulb, 
  Code, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Loader2 
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface ChallengeDrawerProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onLoadSQL: (sql: string) => void;
  currentSQL: string;
}

export function ChallengeDrawer({
  isOpen,
  workspaceId,
  onClose,
  onLoadSQL,
  currentSQL,
}: ChallengeDrawerProps) {
  const { t, language } = useLanguage();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengeStats, setChallengeStats] = useState<any>({ completed: 0, total: 12, earned_xp: 0, total_xp: 1650 });
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [revealedHintIndex, setRevealedHintIndex] = useState<number>(-1);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadChallenges = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const res = await api.getChallenges(workspaceId, filterDifficulty, filterCategory);
      const items = res.challenges || [];
      setChallenges(items);
      if (res.stats) setChallengeStats(res.stats);
      setSelectedChallenge((curr: any) => {
        if (!curr || !items.some((c: any) => c.id === curr.id)) {
          return items.length > 0 ? items[0] : null;
        }
        return curr;
      });
    } catch {
      // Challenge load failed; drawer shows empty state
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, filterDifficulty, filterCategory]);

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
    }
  }, [isOpen, loadChallenges]);

  const handleSelectChallenge = (challenge: any) => {
    setSelectedChallenge(challenge);
    setRevealedHintIndex(-1);
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!selectedChallenge || !workspaceId) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await api.validateChallenge(selectedChallenge.id, currentSQL, workspaceId);
      setValidationResult(res);
      if (res.is_passed) {
        loadChallenges(); // Refresh completed status and XP
      }
    } catch (err: any) {
      setValidationResult({
        is_passed: false,
        message: err.message || "Gagal memverifikasi query.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  const categories = ["All", "Fundamentals", "Aggregations", "Joins", "Window Functions", "CTEs"];
  const difficulties = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex justify-end select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-2xl h-full flex flex-col shadow-2xl p-0 border-y-0 border-r-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-300" />
            <span className="font-bold">{t.challenges.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.challenges.close}
          >
            ✕
          </button>
        </div>

        {/* XP & Progress Strip (Status Bar) */}
        <div className="win-status-bar px-2 py-1 justify-between flex-wrap gap-2 border-b border-[var(--win-border-dark)]">
          <div className="flex items-center gap-2">
            <div className="win-status-panel font-bold text-amber-700 bg-amber-50">
              <Zap size={11} className="fill-amber-500" />
              <span>{challengeStats.earned_xp || 0} / {challengeStats.total_xp || 1650} XP</span>
            </div>
            <div className="win-status-panel font-mono text-[11px]">
              <span>{t.challenges.stats(challengeStats.completed || 0, challengeStats.total || 12, challengeStats.earned_xp || 0, challengeStats.total_xp || 1650)}</span>
            </div>
          </div>

          <div className="win-inset w-36 h-3 p-0.5 bg-[var(--win-inset-bg)]">
            <div 
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${Math.min(100, ((challengeStats.completed || 0) / (challengeStats.total || 12)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Content Split: Left challenge list, Right details */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden m-1 gap-1">
          {/* Challenge Selector List */}
          <div className="w-full md:w-64 win-inset flex flex-col max-h-56 md:max-h-full bg-[var(--win-inset-bg)]">
            {/* Filter Buttons */}
            <div className="p-1.5 border-b border-[var(--win-border-medium)] space-y-1 bg-[var(--win-surface)]">
              {/* Difficulty */}
              <div className="flex gap-0.5 overflow-x-auto pb-0.5">
                {difficulties.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setFilterDifficulty(diff)}
                    className={`win-btn text-[10px] !px-1.5 !py-0.5 ${
                      filterDifficulty === diff ? "win-inset font-bold" : ""
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              {/* Category */}
              <div className="flex gap-0.5 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`win-btn text-[10px] !px-1.5 !py-0.5 ${
                      filterCategory === cat ? "win-inset font-bold text-blue-700" : ""
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-1 space-y-1">
              {isLoading && challenges.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--win-text-muted)] flex flex-col items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-700" />
                  <span>{language === "id" ? "Memuat tantangan..." : "Loading challenges..."}</span>
                </div>
              ) : challenges.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-[var(--win-text-muted)]">
                  {language === "id" ? "Tidak ada tantangan dalam kategori ini." : "No challenges found in this category."}
                </div>
              ) : (
                challenges.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectChallenge(c)}
                    className={`w-full text-left p-1.5 text-xs flex items-center justify-between gap-1.5 transition ${
                      selectedChallenge?.id === c.id
                        ? "bg-[#0055ea] text-white font-bold"
                        : "hover:bg-blue-50 text-[var(--win-text)] border border-[var(--win-border-medium)]"
                    }`}
                  >
                    <div className="truncate min-w-0">
                      <div className="truncate">{c.title}</div>
                      <div className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">
                        <span className="font-mono">+{c.points_xp || 100} XP</span>
                        <span>•</span>
                        <span>{c.difficulty}</span>
                      </div>
                    </div>
                    {c.is_completed ? (
                      <CheckCircle size={14} className={selectedChallenge?.id === c.id ? "text-white" : "text-emerald-600"} />
                    ) : (
                      <ChevronRight size={12} className="opacity-50" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Challenge Detail & Validator */}
          {selectedChallenge ? (
            <div className="flex-1 win-inset p-3 overflow-y-auto space-y-3 bg-[var(--win-inset-bg)] text-[var(--win-text)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-400">
                    {selectedChallenge.difficulty}
                  </span>
                  <span className="text-xs text-[var(--win-text-muted)]">{selectedChallenge.category}</span>
                  <span className="ml-auto text-[11px] font-mono font-bold text-blue-700">
                    +{selectedChallenge.points_xp || 100} XP
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--win-text)]">{selectedChallenge.title}</h3>
                <p className="text-xs mt-1.5 leading-relaxed win-inset p-2.5 bg-[var(--win-surface-alt)]">
                  {selectedChallenge.description}
                </p>
              </div>

              {/* Action: Load Starter Code */}
              <div className="flex items-center justify-between p-2 win-outset bg-[var(--win-surface)] text-xs">
                <div>
                  <span className="text-[var(--win-text-muted)]">
                    {language === "id" ? "Tabel digunakan: " : "Tables used: "}
                  </span>
                  <code className="font-mono font-bold text-blue-700">customers, orders</code>
                </div>
                <button
                  onClick={() => onLoadSQL(selectedChallenge.starter_sql)}
                  className="win-btn text-xs font-bold flex items-center gap-1"
                >
                  <Code size={12} />
                  <span>{t.challenges.loadSql}</span>
                </button>
              </div>

              {/* Tiered Hints */}
              {selectedChallenge.hints && selectedChallenge.hints.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-amber-500" />
                    <span>{t.challenges.hintsProgress(selectedChallenge.hints.length)}</span>
                  </div>

                  <div className="space-y-1">
                    {selectedChallenge.hints.map((hint: string, hIdx: number) => {
                      const isRevealed = revealedHintIndex >= hIdx;
                      const isLast = hIdx === selectedChallenge.hints.length - 1;
                      return (
                        <div
                          key={hIdx}
                          className="p-2 win-inset bg-[var(--win-surface-alt)] text-xs"
                        >
                          {isRevealed ? (
                            <div>
                              <strong className="text-amber-700">{t.challenges.hintLabel(hIdx + 1)}: </strong>
                              {hint}
                            </div>
                          ) : (
                            <button
                              onClick={() => setRevealedHintIndex(hIdx)}
                              className="text-xs text-[var(--win-text-muted)] hover:text-blue-700 flex items-center justify-between w-full"
                            >
                              <span>{t.challenges.revealHintBtn(hIdx + 1, isLast)}</span>
                              <span className="text-[10px] font-bold text-blue-700 underline">{t.challenges.revealAction}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Validation Result Box */}
              {validationResult && (
                <div
                  className={`p-3 win-inset text-xs space-y-1.5 ${
                    validationResult.is_passed
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "bg-rose-50 border-rose-500 text-rose-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {validationResult.is_passed ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>{t.challenges.passedMsg(selectedChallenge.points_xp || 100)}</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-rose-600" />
                        <span>{t.challenges.failedMsg}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">{validationResult.message}</p>
                  {validationResult.diff_details && (
                    <div className="win-inset p-2 font-mono text-[11px] bg-[var(--win-inset-bg)] text-[var(--win-text)] break-words">
                      {validationResult.diff_details}
                    </div>
                  )}
                </div>
              )}

              {/* Validate Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="win-btn win-btn-primary font-bold text-xs w-full py-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>{t.challenges.verifying}</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="fill-white" />
                      <span>{t.challenges.submitVerify}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
