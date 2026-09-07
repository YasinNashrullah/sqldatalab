import { format } from "sql-formatter";

export type SQLFormatPreset = "modern" | "classic" | "compact" | "uppercase";

export interface FormatPresetMeta {
  id: SQLFormatPreset;
  label: string;
  badge: string;
  desc: string;
  shortcut?: string;
}

export const FORMAT_PRESETS: FormatPresetMeta[] = [
  {
    id: "modern",
    label: "Modern (2 Spasi)",
    badge: "2-Sp",
    desc: "Standar industri modern (DuckDB, Snowflake, dbt) dengan indentasi 2 spasi",
    shortcut: "Shift+Alt+F",
  },
  {
    id: "classic",
    label: "Classic (4 Spasi)",
    badge: "4-Sp",
    desc: "Format tradisional korporat / enterprise dengan indentasi 4 spasi",
  },
  {
    id: "compact",
    label: "Compact / Minify",
    badge: "1-Line",
    desc: "Format ringkas minim baris baru, cocok untuk subquery atau sharing kueri",
  },
  {
    id: "uppercase",
    label: "Hanya UPPERCASE",
    badge: "CAPS",
    desc: "Kapitalkan seluruh keyword & fungsi SQL tanpa mengubah posisi baris",
  },
];

// Single word tokens that should always be uppercase in SQL
const AUTO_UPPERCASE_WORDS = new Set([
  "SELECT", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "ON",
  "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "DISTINCT", "AS", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "ILIKE", "IS", "NULL",
  "CASE", "WHEN", "THEN", "ELSE", "END",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "ROUND", "CAST", "CONCAT",
  "STRFTIME", "DATE_TRUNC", "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD", "NTILE",
  "UNION", "ALL", "INTERSECT", "EXCEPT", "WITH", "OVER", "PARTITION",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "DROP", "ALTER", "TABLE",
  "VIEW", "TRUE", "FALSE", "ASC", "DESC", "EXISTS", "ANY", "SOME"
]);

// List of standard function names that should not have a space before '('
const COMMON_FUNCTIONS_NO_SPACE = new Set([
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "ROUND", "CAST", "CONCAT",
  "STRFTIME", "DATE_TRUNC", "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD",
  "NTILE", "NULLIF", "SUBSTRING", "LOWER", "UPPER", "TRIM", "ABS", "CEIL", "FLOOR",
  "FIRST_VALUE", "LAST_VALUE", "EXTRACT", "POSITION", "GREATEST", "LEAST"
]);

/**
 * Capitalizes SQL keywords while leaving comments and string literals intact.
 */
export function uppercaseSQLKeywordsOnly(sql: string): string {
  if (!sql) return "";
  return sql.replace(/'(?:''|[^'])*'|--.*$|\/\*[\s\S]*?\*\/|\b([a-zA-Z_]+)\b/gm, (match, word) => {
    if (!word) return match; // Comment or string literal, preserve as is
    const upper = word.toUpperCase();
    if (AUTO_UPPERCASE_WORDS.has(upper)) {
      return upper;
    }
    return match;
  });
}

/**
 * Clean function paren spacing: e.g. "COUNT (" -> "COUNT(", but keeps "IN (" and "OVER ("
 */
function cleanFunctionParenSpacing(sql: string): string {
  return sql.replace(/\b([A-Za-z0-9_]+)\s+\(/g, (match, fn) => {
    const upperFn = fn.toUpperCase();
    if (COMMON_FUNCTIONS_NO_SPACE.has(upperFn)) {
      return `${upperFn}(`;
    }
    if (upperFn === "OVER") {
      return `OVER (`;
    }
    return match;
  });
}

/**
 * Compact formatting: removes redundant spaces/blank lines while preserving safe SQL tokens.
 */
function compactSQL(sql: string): string {
  const uppercased = uppercaseSQLKeywordsOnly(sql);
  return uppercased
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s*([,;()=><])\s*/g, (match, sym) => {
      if (sym === ",") return ", ";
      if (sym === "(") return " (";
      if (sym === ")") return ") ";
      if (sym === ";") return ";\n";
      return ` ${sym} `;
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Master formatting function for SQL queries supporting multiple presets.
 */
export function formatSQL(sql: string, preset: SQLFormatPreset = "modern"): string {
  const raw = sql.trim();
  if (!raw) return "";

  if (preset === "uppercase") {
    return uppercaseSQLKeywordsOnly(raw);
  }

  if (preset === "compact") {
    return compactSQL(raw);
  }

  const tabWidth = preset === "classic" ? 4 : 2;

  try {
    const formatted = format(raw, {
      language: "duckdb",
      tabWidth: tabWidth,
      useTabs: false,
      keywordCase: "upper",
      dataTypeCase: "upper",
      functionCase: "upper",
      linesBetweenQueries: 2,
    });

    return cleanFunctionParenSpacing(formatted);
  } catch {
    // Graceful fallback to regex-based uppercase if query contains partial syntax
    return uppercaseSQLKeywordsOnly(raw);
  }
}
