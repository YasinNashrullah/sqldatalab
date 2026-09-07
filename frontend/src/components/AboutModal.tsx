"use client";

import React, { useState } from "react";
import {
  Info,
  User,
  Cpu,
  HelpCircle,
  Heart,
  Mail,
  CheckCircle2,
  Database
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"creator" | "specs" | "shortcuts" | "credits">("creator");

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-lg shadow-2xl p-0 flex flex-col max-h-[90vh] bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="text-amber-300" />
            <span className="font-bold">{t.aboutModal.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.aboutModal.close}
          >
            ✕
          </button>
        </div>

        {/* Banner Header */}
        <div className="p-3 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center gap-3">
          <div className="w-12 h-12 win-inset flex items-center justify-center bg-gradient-to-br from-[#0055ea] to-blue-800 text-white flex-shrink-0 shadow-xs">
            <Database size={24} className="text-amber-300 drop-shadow" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--win-text)] flex items-center gap-1.5">
              <span>SQLDataLab Studio</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-emerald-600 text-white font-mono font-bold rounded-xs">
                v1.0
              </span>
            </h2>
            <p className="text-[11px] text-[var(--win-text-muted)] mt-0.5">
              Interactive DuckDB In-Memory Analytics & Query Studio
            </p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)] overflow-x-auto">
          <button
            onClick={() => setActiveTab("creator")}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-2.5 cursor-pointer ${
              activeTab === "creator" ? "active font-bold text-blue-700" : "text-[var(--win-text)]"
            }`}
          >
            <User size={12} />
            <span>{t.aboutModal.tabAboutMe}</span>
          </button>

          <button
            onClick={() => setActiveTab("specs")}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-2.5 cursor-pointer ${
              activeTab === "specs" ? "active font-bold text-blue-700" : "text-[var(--win-text)]"
            }`}
          >
            <Cpu size={12} />
            <span>{t.aboutModal.tabSpecs}</span>
          </button>

          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-2.5 cursor-pointer ${
              activeTab === "shortcuts" ? "active font-bold text-blue-700" : "text-[var(--win-text)]"
            }`}
          >
            <HelpCircle size={12} />
            <span>{t.aboutModal.tabShortcuts}</span>
          </button>

          <button
            onClick={() => setActiveTab("credits")}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-2.5 cursor-pointer ${
              activeTab === "credits" ? "active font-bold text-blue-700" : "text-[var(--win-text)]"
            }`}
          >
            <Heart size={12} />
            <span>{t.aboutModal.tabCredits}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3 overflow-y-auto max-h-[60vh] space-y-3">
          {/* TAB 1: About Me & Creator */}
          {activeTab === "creator" && (
            <div className="space-y-3">
              <div className="win-inset p-3 bg-[var(--win-inset-bg)] flex items-start gap-3">
                <div className="w-14 h-14 win-outset bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-xs">
                  Y
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[var(--win-text)]">Yasin</h3>
                    <span className="px-1 text-[9px] bg-blue-600 text-white font-mono font-bold">
                      {t.aboutModal.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--win-text-muted)] font-medium mt-0.5">
                    {t.aboutModal.roleSub}
                  </p>
                  <p className="text-xs text-[var(--win-text)] leading-relaxed mt-2">
                    {t.aboutModal.bio}
                  </p>
                </div>
              </div>

              {/* Specialization Pills */}
              <div className="win-inset p-2.5 bg-[var(--win-surface)] space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--win-text)] block">
                  {t.aboutModal.skillsTitle}
                </span>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 win-outset bg-[var(--win-surface)] font-mono font-bold">
                    SQL & Analytical Queries
                  </span>
                  <span className="px-2 py-0.5 win-outset bg-[var(--win-surface)] font-mono font-bold">
                    DuckDB In-Memory OLAP
                  </span>
                  <span className="px-2 py-0.5 win-outset bg-[var(--win-surface)] font-mono font-bold">
                    FastAPI (Python 3.12)
                  </span>
                  <span className="px-2 py-0.5 win-outset bg-[var(--win-surface)] font-mono font-bold">
                    Next.js & TypeScript
                  </span>
                  <span className="px-2 py-0.5 win-outset bg-[var(--win-surface)] font-mono font-bold">
                    Data Architecture & Modeling
                  </span>
                </div>
              </div>

              {/* Contact & Links */}
              <div className="win-inset p-2.5 bg-[var(--win-surface)] flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-bold text-[var(--win-text)] text-[11px]">
                  {t.aboutModal.contactTitle}
                </span>
                <div className="flex items-center gap-1.5">
                  <a
                    href="https://github.com/YasinNashrullah"
                    target="_blank"
                    rel="noreferrer"
                    className="win-btn text-[11px] py-0.5 px-2 flex items-center gap-1 font-bold"
                  >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/yasin-nashrullah-85191b289/"
                    target="_blank"
                    rel="noreferrer"
                    className="win-btn text-[11px] py-0.5 px-2 flex items-center gap-1 font-bold text-blue-700"
                  >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href="yasinnashrullah@gmail.com"
                    className="win-btn text-[11px] py-0.5 px-2 flex items-center gap-1 font-bold"
                  >
                    <Mail size={12} />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: System Specs */}
          {activeTab === "specs" && (
            <div className="space-y-2">
              <div className="win-inset p-2.5 bg-[var(--win-inset-bg)] space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">Application Name:</span>
                  <span className="font-bold text-[var(--win-text)]">SQLDataLab Analytics Studio</span>
                </div>
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">Build Version:</span>
                  <span className="font-bold text-emerald-700">v1.0 (Retro Boxy Edition)</span>
                </div>
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">Query Engine:</span>
                  <span className="font-bold text-[var(--win-text)]">DuckDB v1.2 (In-Memory OLAP)</span>
                </div>
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">Backend Framework:</span>
                  <span className="font-bold text-[var(--win-text)]">FastAPI (Python 3.12)</span>
                </div>
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">Frontend Framework:</span>
                  <span className="font-bold text-[var(--win-text)]">Next.js 16 + React 19 + TypeScript</span>
                </div>
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">SQL Code Editor:</span>
                  <span className="font-bold text-[var(--win-text)]">Monaco Editor (VS Code Engine)</span>
                </div>
                <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-1">
                  <span className="text-[var(--win-text-muted)]">Storage Isolation:</span>
                  <span className="font-bold text-[var(--win-text)]">Per-User & Per-Workspace Subfolders</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--win-text-muted)]">Max CSV Upload:</span>
                  <span className="font-bold text-blue-700">50 MB per file</span>
                </div>
              </div>

              <div className="win-status-panel text-[11px] text-emerald-700 bg-emerald-50 flex items-center gap-1.5 w-full">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <span>{t.aboutModal.specsStatus}</span>
              </div>
            </div>
          )}

          {/* TAB 3: Help & Shortcuts */}
          {activeTab === "shortcuts" && (
            <div className="space-y-3">
              <div className="win-inset p-2.5 bg-[var(--win-inset-bg)] space-y-1.5">
                <span className="text-xs font-bold text-[var(--win-text)] block mb-1">
                  {t.aboutModal.shortcutsTitle}
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="p-1.5 win-outset bg-[var(--win-surface)] flex items-center justify-between">
                    <span className="text-[11px]">Jalankan Query</span>
                    <kbd className="px-1 py-0.5 bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)] font-mono text-[10px] font-bold">
                      Ctrl + Enter / F5
                    </kbd>
                  </div>
                  <div className="p-1.5 win-outset bg-[var(--win-surface)] flex items-center justify-between">
                    <span className="text-[11px]">Command Palette</span>
                    <kbd className="px-1 py-0.5 bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)] font-mono text-[10px] font-bold">
                      Ctrl + K
                    </kbd>
                  </div>
                  <div className="p-1.5 win-outset bg-[var(--win-surface)] flex items-center justify-between">
                    <span className="text-[11px]">Rapikan SQL (Format)</span>
                    <kbd className="px-1 py-0.5 bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)] font-mono text-[10px] font-bold">
                      Shift + Alt + F
                    </kbd>
                  </div>
                  <div className="p-1.5 win-outset bg-[var(--win-surface)] flex items-center justify-between">
                    <span className="text-[11px]">Simpan Query</span>
                    <kbd className="px-1 py-0.5 bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)] font-mono text-[10px] font-bold">
                      Save / Ctrl+S
                    </kbd>
                  </div>
                </div>
              </div>

              <div className="win-inset p-2.5 bg-[var(--win-surface)] space-y-1 text-xs">
                <span className="font-bold text-[var(--win-text)] text-[11px] block">
                  {t.aboutModal.tipsTitle}
                </span>
                <ul className="list-disc list-inside text-[11px] text-[var(--win-text-muted)] space-y-1 leading-relaxed">
                  <li>
                    {t.aboutModal.tipCsv}
                  </li>
                  <li>
                    {t.aboutModal.tipWorkspace}
                  </li>
                  <li>
                    {t.aboutModal.tipSnippets}
                  </li>
                  <li>
                    {t.aboutModal.tipTheme}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: Credits */}
          {activeTab === "credits" && (
            <div className="space-y-2">
              <div className="win-inset p-3 bg-[var(--win-inset-bg)] text-xs space-y-2 leading-relaxed">
                <p className="text-[11px] text-[var(--win-text)] font-semibold">
                  {t.aboutModal.creditsDesc}
                </p>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-0.5">
                    <span className="font-bold">DuckDB</span>
                    <span className="text-[var(--win-text-muted)]">MIT License (DuckDB Foundation)</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-0.5">
                    <span className="font-bold">Next.js & React</span>
                    <span className="text-[var(--win-text-muted)]">MIT License (Vercel, Inc.)</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-0.5">
                    <span className="font-bold">FastAPI & Starlette</span>
                    <span className="text-[var(--win-text-muted)]">BSD License (Tiangolo)</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--win-border-dark)] pb-0.5">
                    <span className="font-bold">Monaco Editor</span>
                    <span className="text-[var(--win-text-muted)]">MIT License (Microsoft)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Lucide Icons</span>
                    <span className="text-[var(--win-text-muted)]">ISC License</span>
                  </div>
                </div>
              </div>

              <div className="p-2 text-center text-[10px] text-[var(--win-text-muted)] font-mono">
                Crafted with care for Data Enthusiasts & SQL Practitioners.
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <div className="p-2.5 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center justify-between">
          <div className="text-[10px] text-[var(--win-text-muted)] font-mono">
            SQLDataLab © 2026
          </div>
          <button
            onClick={onClose}
            className="win-btn win-btn-primary px-4 py-1 text-xs font-bold"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
