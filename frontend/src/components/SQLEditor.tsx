"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { 
  Play, 
  Sparkles, 
  AlignLeft, 
  BookmarkPlus, 
  Trash2, 
  Loader2,
  Terminal,
  Maximize2,
  Minimize2,
  CaseUpper,
  Check,
  Activity,
  BookOpen,
  ChevronDown
} from "lucide-react";
import { formatSQL, FORMAT_PRESETS, SQLFormatPreset } from "@/lib/sqlFormatter";
import { useLanguage } from "@/lib/i18n";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export interface TableSchemaMeta {
  tableName: string;
  columns: { name: string; type: string }[];
}

interface SQLEditorProps {
  value: string;
  onChange: (val: string) => void;
  onExecute: () => void;
  onFormat?: () => void;
  onSave: () => void;
  onClear: () => void;
  onExplainAI: () => void;
  onExplainPlan?: () => void;
  onOpenSnippets?: () => void;
  isExecuting: boolean;
  tables?: TableSchemaMeta[];
  themeMode?: "winxp" | "dark";
}

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
  "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN", "CROSS JOIN", "ON",
  "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM",
  "CREATE TABLE", "DROP TABLE", "ALTER TABLE", "TRUNCATE",
  "DISTINCT", "AS", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "ILIKE", "IS NULL", "IS NOT NULL",
  "CASE", "WHEN", "THEN", "ELSE", "END",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "ROUND", "CAST", "CONCAT",
  "UNION", "UNION ALL", "INTERSECT", "EXCEPT",
  "WITH", "OVER", "PARTITION BY", "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD",
  "EXISTS", "ALL", "ANY", "TRUE", "FALSE", "NULL", "ASC", "DESC"
];

// Single word tokens that trigger auto-uppercase when followed by whitespace or delimiter
const AUTO_UPPERCASE_WORDS = new Set([
  "SELECT", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "ON",
  "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "DISTINCT", "AS", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "ILIKE", "IS", "NULL",
  "CASE", "WHEN", "THEN", "ELSE", "END",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "ROUND", "CAST", "CONCAT",
  "UNION", "ALL", "INTERSECT", "EXCEPT", "WITH",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "DROP", "ALTER", "TABLE",
  "TRUE", "FALSE", "ASC", "DESC"
]);

export function uppercaseSQLKeywords(sql: string): string {
  if (!sql) return "";
  return sql.replace(/'(?:''|[^'])*'|\b([a-zA-Z_]+)\b/g, (match, word) => {
    if (!word) return match; // Keep string literals untouched
    const upper = word.toUpperCase();
    if (AUTO_UPPERCASE_WORDS.has(upper)) {
      return upper;
    }
    return match;
  });
}

export function SQLEditor({
  value,
  onChange,
  onExecute,
  onFormat,
  onSave,
  onClear,
  onExplainAI,
  onExplainPlan,
  onOpenSnippets,
  isExecuting,
  tables = [],
  themeMode = "winxp",
}: SQLEditorProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoUpperActive, setAutoUpperActive] = useState(true);
  const { t, language } = useLanguage();

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const tablesRef = useRef<TableSchemaMeta[]>(tables);
  const isInternalChangeRef = useRef(false);
  const completionProviderRef = useRef<any>(null);
  const autoUpperRef = useRef(autoUpperActive);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    autoUpperRef.current = autoUpperActive;
  }, [autoUpperActive]);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Global Ctrl+Enter key listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onExecute();
    }
  };

  const [selectedPreset, setSelectedPreset] = useState<SQLFormatPreset>("modern");
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [formatToast, setFormatToast] = useState<string | null>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Load saved preset from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqltrain_format_preset") as SQLFormatPreset;
      if (saved && FORMAT_PRESETS.some((p) => p.id === saved)) {
        setSelectedPreset(saved);
      }
    }
  }, []);

  // Close format menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
    };
    if (showFormatMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFormatMenu]);

  const showToastFeedback = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFormatToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setFormatToast(null);
    }, 2200);
  };

  const handleFormatSQL = (presetToUse?: SQLFormatPreset) => {
    const preset = presetToUse || selectedPreset;
    const editor = editorRef.current;

    // Format selected text range if active selection exists
    if (editor) {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        const selectedText = model.getValueInRange(selection);
        if (selectedText.trim()) {
          const formatted = formatSQL(selectedText, preset);
          isInternalChangeRef.current = true;
          editor.executeEdits("format-selection", [
            {
              range: selection,
              text: formatted,
            },
          ]);
          isInternalChangeRef.current = false;
          showToastFeedback(language === "id" ? `Pilihan dirapikan (${preset})` : `Selection formatted (${preset})`);
          return;
        }
      }
    }

    // Format entire SQL editor document
    const targetText = value || (editor ? editor.getValue() : "");
    if (!targetText.trim()) return;

    const formatted = formatSQL(targetText, preset);
    onChange(formatted);
    const activeMeta = FORMAT_PRESETS.find((p) => p.id === preset);
    showToastFeedback(language === "id" ? `Dirapikan (${activeMeta?.badge || preset})` : `Formatted (${activeMeta?.badge || preset})`);
    if (onFormat) onFormat();
  };

  const selectPreset = (preset: SQLFormatPreset) => {
    setSelectedPreset(preset);
    if (typeof window !== "undefined") {
      localStorage.setItem("sqltrain_format_preset", preset);
    }
    setShowFormatMenu(false);
    handleFormatSQL(preset);
  };

  // One-click Uppercase formatter
  const handleUppercaseFormat = () => {
    handleFormatSQL("uppercase");
  };

  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        try {
          completionProviderRef.current.dispose();
        } catch {}
        completionProviderRef.current = null;
      }
    };
  }, []);

  // Monaco setup on mount
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Dispose existing completion provider to prevent duplicates
    if (completionProviderRef.current) {
      try {
        completionProviderRef.current.dispose();
      } catch {}
      completionProviderRef.current = null;
    }

    completionProviderRef.current = monaco.languages.registerCompletionItemProvider("sql", {
      triggerCharacters: [" ", ".", "\n", "\t", "("],
      provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: any[] = [];

          // Autocomplete standard SQL keywords
          SQL_KEYWORDS.forEach((kw) => {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw + " ",
              range,
              detail: "SQL Keyword (UPPERCASE)",
              sortText: "10_" + kw,
            });
          });

          // Autocomplete common SQL query snippets
          const snippets = [
            {
              label: "SELECT * FROM ...",
              insertText: "SELECT * FROM ${1:table} LIMIT ${2:10};",
              detail: "Quick select query",
              sortText: "01_sel_all",
            },
            {
              label: "SELECT COUNT(*) FROM ...",
              insertText: "SELECT COUNT(*) AS total FROM ${1:table};",
              detail: "Count rows query",
              sortText: "02_count",
            },
            {
              label: "GROUP BY ... HAVING ...",
              insertText: "GROUP BY ${1:column}\nHAVING COUNT(*) > ${2:1}",
              detail: "Aggregate grouping query",
              sortText: "03_group_by",
            },
            {
              label: "LEFT JOIN ... ON ...",
              insertText: "LEFT JOIN ${1:table2} ON ${2:table1.id} = ${3:table2.id}",
              detail: "Left Outer Join snippet",
              sortText: "04_left_join",
            },
            {
              label: "INNER JOIN ... ON ...",
              insertText: "INNER JOIN ${1:table2} ON ${2:table1.id} = ${3:table2.id}",
              detail: "Inner Join snippet",
              sortText: "05_inner_join",
            },
            {
              label: "CASE WHEN ... THEN ... ELSE ... END",
              insertText: "CASE \n  WHEN ${1:condition} THEN ${2:val1}\n  ELSE ${3:default_val}\nEND",
              detail: "Conditional Expression",
              sortText: "06_case_when",
            },
          ];

          snippets.forEach((s) => {
            suggestions.push({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: s.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: s.detail,
              sortText: s.sortText,
            });
          });

          // Autocomplete workspace dataset tables
          const currentTables = tablesRef.current || [];
          currentTables.forEach((tbl) => {
            const colSummary = tbl.columns.map((c) => `${c.name} (${c.type})`).join(", ");
            suggestions.push({
              label: tbl.tableName,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: tbl.tableName,
              range,
              detail: `Table (${tbl.columns.length} columns)`,
              documentation: {
                value: `**Dataset Table:** \`${tbl.tableName}\`\n\n**Columns:** ${colSummary}`,
              },
              sortText: "05_" + tbl.tableName,
            });

            // Autocomplete table column attributes
            tbl.columns.forEach((col) => {
              suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                range,
                detail: `${col.type} • ${tbl.tableName}`,
                documentation: {
                  value: `**Column:** \`${col.name}\`\n**Type:** \`${col.type}\`\n**Parent Table:** \`${tbl.tableName}\``,
                },
                sortText: "08_" + col.name,
              });
            });
          });

          return { suggestions };
        },
      });

    // Auto-uppercase listener on typing
    const changeDisposable = editor.onDidChangeModelContent((event: any) => {
      if (!autoUpperRef.current || isInternalChangeRef.current) return;

      for (const change of event.changes) {
        // Trigger on delimiter characters: space, tab, newline, comma, semicolon, closing paren
        if (/[\s,;()]/.test(change.text)) {
          const position = editor.getPosition();
          if (!position) continue;
          const model = editor.getModel();
          if (!model) continue;

          const line = model.getLineContent(position.lineNumber);
          const textBefore = line.substring(0, Math.max(0, position.column - 1));
          const match = textBefore.match(/\b([a-zA-Z_]+)\s*$/);

          if (match) {
            const word = match[1];
            const upperWord = word.toUpperCase();
            const wordIdx = textBefore.lastIndexOf(word);
            const charBefore = wordIdx > 0 ? textBefore[wordIdx - 1] : "";

            // Avoid altering object paths (e.g. table.column) or inside string literals
            if (charBefore !== "." && AUTO_UPPERCASE_WORDS.has(upperWord) && word !== upperWord) {
              const quotesBefore = (textBefore.substring(0, wordIdx).match(/'/g) || []).length;
              if (quotesBefore % 2 === 1) {
                // Inside quote literal
                continue;
              }

              const startCol = wordIdx + 1;
              const endCol = startCol + word.length;

              isInternalChangeRef.current = true;
              editor.executeEdits("auto-uppercase", [
                {
                  range: new monaco.Range(position.lineNumber, startCol, position.lineNumber, endCol),
                  text: upperWord,
                },
              ]);
              isInternalChangeRef.current = false;
            }
          }
        }
      }
    });

    // Register document formatting provider (Shift+Alt+F / context menu "Format Document")
    const formatProvider = monaco.languages.registerDocumentFormattingEditProvider("sql", {
      provideDocumentFormattingEdits: (model: any) => {
        const text = model.getValue();
        const formatted = formatSQL(text, selectedPreset);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });

    // Register range formatting provider (Format Selection)
    const rangeFormatProvider = monaco.languages.registerDocumentRangeFormattingEditProvider("sql", {
      provideDocumentRangeFormattingEdits: (model: any, range: any) => {
        const text = model.getValueInRange(range);
        const formatted = formatSQL(text, selectedPreset);
        return [
          {
            range: range,
            text: formatted,
          },
        ];
      },
    });

    editor.onDidDispose(() => {
      try {
        formatProvider.dispose();
        rangeFormatProvider.dispose();
        changeDisposable.dispose();
      } catch {}
    });
  };

  return (
    <div className={`win-window flex flex-col ${isFullscreen ? "fixed inset-2 z-50 shadow-2xl" : "h-[280px] sm:h-[320px]"}`}>
      {/* Windows XP Window Titlebar */}
      <div className="win-titlebar">
        <div className="flex items-center gap-1.5">
          <Terminal size={13} className="text-amber-300" />
          <span className="font-bold">{t.editor.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="win-control-btn" title={language === "id" ? "Minimalkan" : "Minimize"}>_</button>
          <button className="win-control-btn" onClick={() => setIsFullscreen(!isFullscreen)} title={language === "id" ? "Maksimalkan" : "Maximize"}>□</button>
          <button className="win-control-btn win-close" onClick={onClear} title={t.editor.clear}>✕</button>
        </div>
      </div>

      {/* Editor Retro Toolbar */}
      <div className="px-2 py-1 flex items-center justify-between border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex-wrap gap-1">
        <div className="flex items-center gap-1">
          {/* Primary Run Button (WinXP Green) */}
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="win-btn win-btn-primary font-bold text-xs"
            title={language === "id" ? "Jalankan SQL (F5 / Ctrl+Enter)" : "Run SQL (F5 / Ctrl+Enter)"}
          >
            {isExecuting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>{t.editor.running}</span>
              </>
            ) : (
              <>
                <Play size={12} className="fill-white" />
                <span>{t.editor.run}</span>
              </>
            )}
          </button>

          {/* Format Button with Dropdown Presets */}
          <div className="relative flex items-center" ref={formatMenuRef}>
            <button
              onClick={() => handleFormatSQL()}
              title={`Format SQL (${FORMAT_PRESETS.find(p => p.id === selectedPreset)?.label}) • Shift+Alt+F`}
              className="win-btn text-xs"
            >
              <AlignLeft size={12} className="text-blue-700" />
              <span className="hidden md:inline">{t.editor.format}</span>
              <span className="text-[10px] px-1 bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)] font-mono">
                {FORMAT_PRESETS.find(p => p.id === selectedPreset)?.badge || "2-Sp"}
              </span>
            </button>
            <button
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              title={t.editor.formatStyleTitle}
              className="win-btn text-xs !px-1"
            >
              <ChevronDown size={11} className={showFormatMenu ? "rotate-180" : ""} />
            </button>

            {/* Dropdown Popover */}
            {showFormatMenu && (
              <div className="absolute left-0 top-full mt-1 w-64 win-outset p-1 z-50 shadow-2xl text-left">
                <div className="px-2 py-1 border-b border-[var(--win-border-dark)] mb-1 flex items-center justify-between font-bold text-xs">
                  <span>{t.editor.formatStyleTitle}</span>
                  <span className="text-[10px] text-[var(--win-text-muted)] font-mono">Shift+Alt+F</span>
                </div>
                {FORMAT_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => selectPreset(preset.id)}
                      className={`w-full px-2 py-1.5 text-left text-xs flex items-start gap-2 ${
                        isSelected ? "bg-[#0055ea] text-white font-bold" : "hover:bg-[#0055ea] hover:text-white"
                      }`}
                    >
                      <div className="mt-0.5 w-3 flex items-center justify-center">
                        {isSelected && <span>✓</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">{preset.label}</span>
                          <span className="text-[10px] font-mono px-1 bg-[var(--win-inset-bg)] text-[var(--win-text)] border border-[var(--win-border-dark)]">
                            {preset.badge}
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 leading-tight ${isSelected ? "text-blue-100" : "text-[var(--win-text-muted)]"}`}>{preset.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Auto-uppercase toggle */}
          <button
            onClick={() => setAutoUpperActive(!autoUpperActive)}
            title={autoUpperActive ? "Auto-Uppercase ON" : "Auto-Uppercase OFF"}
            className={`win-btn text-xs ${autoUpperActive ? "win-inset font-bold" : ""}`}
          >
            <CaseUpper size={12} />
            <span className="hidden lg:inline text-[11px]">{t.editor.autoCaps}</span>
            {autoUpperActive && <span>✓</span>}
          </button>

          {/* Uppercase query button */}
          <button
            onClick={handleUppercaseFormat}
            title={language === "id" ? "Ubah semua keyword SQL ke HURUF BESAR" : "Convert all SQL keywords to UPPERCASE"}
            className="win-btn text-xs hidden md:inline-flex"
          >
            <CaseUpper size={12} />
            <span>{t.editor.upper}</span>
          </button>

          {/* Toast Notification badge */}
          {formatToast && (
            <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 border border-emerald-500 text-emerald-800 text-[11px] font-semibold">
              <Check size={11} />
              <span>{formatToast}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onExplainAI}
            title={t.editor.explainAI}
            className="win-btn text-xs text-indigo-700"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">{t.editor.explainAI}</span>
          </button>

          {onExplainPlan && (
            <button
              onClick={onExplainPlan}
              title={language === "id" ? "Rencana Eksekusi DuckDB EXPLAIN" : "DuckDB EXPLAIN plan"}
              className="win-btn text-xs hidden sm:inline-flex"
            >
              <Activity size={12} />
              <span>{t.editor.plan}</span>
            </button>
          )}

          {onOpenSnippets && (
            <button
              onClick={onOpenSnippets}
              title={language === "id" ? "Koleksi Template SQL" : "SQL Snippets"}
              className="win-btn text-xs hidden md:inline-flex"
            >
              <BookOpen size={12} />
              <span>{t.editor.snippets}</span>
            </button>
          )}

          <button
            onClick={onSave}
            title={t.editor.save}
            className="win-btn text-xs"
          >
            <BookmarkPlus size={12} />
            <span className="hidden md:inline">{t.editor.save}</span>
          </button>

          <button
            onClick={onClear}
            title={t.editor.clear}
            className="win-btn text-xs text-rose-600"
          >
            <Trash2 size={12} />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={t.editor.fullscreen}
            className="win-btn text-xs hidden sm:inline-flex"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Mobile Keyword Quick Bar */}
      {isMobile && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[var(--win-surface-alt)] border-b border-[var(--win-border-dark)] overflow-x-auto text-[11px] font-mono">
          {["SELECT", "FROM", "WHERE", "LIMIT 10", "GROUP BY", "ORDER BY", "COUNT(*)"].map((kw) => (
            <button
              key={kw}
              onClick={() => onChange(value ? `${value} ${kw}` : `${kw} `)}
              className="win-btn text-xs whitespace-nowrap !px-1.5 !py-0.5"
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      {/* Editor Body with Sunken 3D Box */}
      <div className="flex-1 w-full relative overflow-hidden win-inset m-1" onKeyDown={handleKeyDown}>
        {isMobile ? (
          /* Mobile Touch-Friendly Code Area */
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t.editor.placeholder}
            className={`w-full h-full p-2 font-mono text-xs focus:outline-none resize-none leading-relaxed select-text ${
              themeMode === "winxp" ? "bg-white text-black" : "bg-slate-950 text-slate-100"
            }`}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
        ) : (
          /* Desktop Monaco Editor */
          <MonacoEditor
            height="100%"
            language="sql"
            theme={themeMode === "winxp" ? "vs" : "vs-dark"}
            value={value}
            onChange={(val) => onChange(val || "")}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              wordWrap: "on",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 6, bottom: 6 },
              lineNumbersMinChars: 3,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              tabCompletion: "on",
              acceptSuggestionOnEnter: "on",
            }}
          />
        )}
      </div>
    </div>
  );
}
