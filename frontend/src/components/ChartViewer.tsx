"use client";

import React, { useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { BarChart3, TrendingUp, PieChart as PieIcon, Layers } from "lucide-react";

interface ChartViewerProps {
  columns: { name: string; type: string }[];
  rows: any[][];
}

const COLORS = [
  "#38bdf8", // Sky blue
  "#818cf8", // Indigo
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#f472b6", // Pink
  "#a78bfa", // Purple
  "#2dd4bf", // Teal
  "#fb923c", // Orange
  "#60a5fa", // Blue
  "#e879f9", // Fuchsia
];

function formatNumber(val: any): string {
  if (val === null || val === undefined) return "—";
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function formatCompactNumber(val: any): string {
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return String(val);
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
  return num.toLocaleString("id-ID");
}

function formatLabel(name: string): string {
  if (!name) return "";
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  yAxisKey?: string;
  xAxisKey?: string;
  totalPieValue?: number;
  isPie?: boolean;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  yAxisKey = "",
  totalPieValue = 0,
  isPie = false,
}) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  const value = item.value;
  const metricName = item.name || item.dataKey || yAxisKey || "Value";
  const color = item.color || item.payload?.fill || item.fill || "#38bdf8";
  const title = label || item.payload?.name || item.name || "Detail";

  let percentage = "";
  if (isPie && totalPieValue > 0 && typeof value === "number") {
    percentage = `${((value / totalPieValue) * 100).toFixed(1)}%`;
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl px-3.5 py-2.5 text-xs pointer-events-none min-w-[160px] max-w-[280px] transition-all">
      {/* Category / Dimension Title */}
      <div className="font-semibold text-slate-200 border-b border-slate-800/80 pb-1.5 mb-2 truncate">
        {title}
      </div>

      {/* Metric Row */}
      <div className="flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-slate-400 font-medium truncate">
            {formatLabel(String(metricName))}:
          </span>
        </div>
        <div className="font-mono font-semibold text-slate-100 shrink-0 text-right">
          {formatNumber(value)}
        </div>
      </div>

      {/* Contribution Share (Donut / Pie) */}
      {percentage && (
        <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Pangsa:</span>
          <span className="font-mono font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
            {percentage}
          </span>
        </div>
      )}
    </div>
  );
};

function ChartViewerComponent({ columns, rows }: ChartViewerProps) {
  const [chartType, setChartType] = useState<"bar" | "line" | "area" | "pie">("bar");
  const [xAxisKey, setXAxisKey] = useState<string>("");
  const [yAxisKey, setYAxisKey] = useState<string>("");

  // Categorize columns
  const columnNames = useMemo(() => columns.map((c) => c.name), [columns]);

  // Set default axes if not set
  React.useEffect(() => {
    if (columnNames.length > 0 && !xAxisKey) {
      setXAxisKey(columnNames[0]);
    }
    if (columnNames.length > 1 && !yAxisKey) {
      setYAxisKey(columnNames[1]);
    } else if (columnNames.length > 0 && !yAxisKey) {
      setYAxisKey(columnNames[0]);
    }
  }, [columnNames, xAxisKey, yAxisKey]);

  // Transform rows to objects for Bar/Line/Area (ensure 100% finite numbers)
  const chartData = useMemo(() => {
    if (!xAxisKey || !yAxisKey || rows.length === 0) return [];
    const xIdx = columnNames.indexOf(xAxisKey);
    const yIdx = columnNames.indexOf(yAxisKey);

    return rows.slice(0, 100).map((r) => {
      const rawY = r[yIdx];
      const num = Number(rawY);
      const parsedY = typeof rawY === "number" && isFinite(rawY)
        ? rawY
        : !isNaN(num) && isFinite(num)
        ? num
        : 0;

      const rawX = r[xIdx] !== null && r[xIdx] !== undefined ? String(r[xIdx]) : "NULL";
      return {
        [xAxisKey]: rawX,
        [yAxisKey]: parsedY,
        name: rawX,
        value: parsedY,
      };
    });
  }, [rows, columnNames, xAxisKey, yAxisKey]);

  // Aggregated data for Pie/Donut (prevents duplicate slice crashing and calculates percentages)
  const pieData = useMemo(() => {
    if (!xAxisKey || !yAxisKey || rows.length === 0) return [];
    const xIdx = columnNames.indexOf(xAxisKey);
    const yIdx = columnNames.indexOf(yAxisKey);

    const map = new Map<string, number>();
    rows.forEach((r) => {
      const rawX = r[xIdx] !== null && r[xIdx] !== undefined ? String(r[xIdx]) : "NULL";
      const rawY = r[yIdx];
      const num = Number(rawY);
      const parsedY = typeof rawY === "number" && isFinite(rawY)
        ? rawY
        : !isNaN(num) && isFinite(num)
        ? num
        : 0;

      if (parsedY > 0) {
        map.set(rawX, (map.get(rawX) || 0) + parsedY);
      }
    });

    const entries = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]); // Sort descending

    // Top 7 categories + "Others"
    if (entries.length > 8) {
      const top7 = entries.slice(0, 7);
      const othersVal = entries.slice(7).reduce((acc, curr) => acc + curr[1], 0);
      top7.push(["Others", othersVal]);
      return top7.map(([name, value]) => ({
        name,
        [xAxisKey]: name,
        [yAxisKey]: value,
        value,
      }));
    }

    return entries.map(([name, value]) => ({
      name,
      [xAxisKey]: name,
      [yAxisKey]: value,
      value,
    }));
  }, [rows, columnNames, xAxisKey, yAxisKey]);

  // Calculate total for Donut / Pie percentage share
  const totalPieValue = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieData]);

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <BarChart3 size={32} className="text-slate-700 mb-2" />
        <p className="text-xs">No data available to visualize.</p>
        <p className="text-[11px] text-slate-600 mt-1">Run a query returning categorical and numerical columns.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full p-2 overflow-hidden select-none bg-[var(--win-surface)] text-[var(--win-text)]">
      {/* Controls Bar */}
      <div className="win-status-bar justify-between flex-wrap gap-2 mb-1">
        {/* Chart Type Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartType("bar")}
            className={`win-btn text-xs ${chartType === "bar" ? "win-inset font-bold" : ""}`}
          >
            <BarChart3 size={12} />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`win-btn text-xs ${chartType === "line" ? "win-inset font-bold" : ""}`}
          >
            <TrendingUp size={12} />
            <span>Line</span>
          </button>
          <button
            onClick={() => setChartType("area")}
            className={`win-btn text-xs ${chartType === "area" ? "win-inset font-bold" : ""}`}
          >
            <Layers size={12} />
            <span>Area</span>
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`win-btn text-xs ${chartType === "pie" ? "win-inset font-bold" : ""}`}
          >
            <PieIcon size={12} />
            <span>Donut</span>
          </button>
        </div>

        {/* Axis Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-[11px]">X-Axis:</span>
            <select
              value={xAxisKey}
              onChange={(e) => setXAxisKey(e.target.value)}
              className="win-inset px-2 py-0.5 text-xs text-[var(--win-text)] focus:outline-none"
            >
              {columnNames.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-[11px]">Y-Axis:</span>
            <select
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value)}
              className="win-inset px-2 py-0.5 text-xs text-[var(--win-text)] focus:outline-none"
            >
              {columnNames.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[220px] win-inset p-2 bg-[var(--win-inset-bg)]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 15, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                dy={6}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                tickFormatter={formatCompactNumber}
                dx={-4}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.08)", radius: 6 }}
                animationDuration={150}
                content={(props: any) => (
                  <CustomChartTooltip
                    {...props}
                    yAxisKey={yAxisKey}
                    xAxisKey={xAxisKey}
                  />
                )}
              />
              <Bar
                dataKey={yAxisKey}
                fill="#38bdf8"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 15, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                dy={6}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                tickFormatter={formatCompactNumber}
                dx={-4}
              />
              <Tooltip
                cursor={{
                  stroke: "rgba(148, 163, 184, 0.35)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                animationDuration={150}
                content={(props: any) => (
                  <CustomChartTooltip
                    {...props}
                    yAxisKey={yAxisKey}
                    xAxisKey={xAxisKey}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#818cf8", stroke: "#0f172a", strokeWidth: 1.5 }}
                activeDot={{ r: 5.5, fill: "#818cf8", stroke: "#020617", strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 15, bottom: 25 }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                dy={6}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
                tickFormatter={formatCompactNumber}
                dx={-4}
              />
              <Tooltip
                cursor={{
                  stroke: "rgba(148, 163, 184, 0.35)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                animationDuration={150}
                content={(props: any) => (
                  <CustomChartTooltip
                    {...props}
                    yAxisKey={yAxisKey}
                    xAxisKey={xAxisKey}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey={yAxisKey}
                stroke="#34d399"
                fill="url(#areaGradient)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#34d399", stroke: "#0f172a", strokeWidth: 1.5 }}
                activeDot={{ r: 5.5, fill: "#34d399", stroke: "#020617", strokeWidth: 2 }}
                connectNulls
              />
            </AreaChart>
          ) : (
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Tooltip
                content={(props: any) => (
                  <CustomChartTooltip
                    {...props}
                    yAxisKey={yAxisKey}
                    xAxisKey={xAxisKey}
                    totalPieValue={totalPieValue}
                    isPie
                  />
                )}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={pieData.length > 1 ? 3 : 0}
                stroke="#090d16"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-opacity duration-150 hover:opacity-80 cursor-pointer outline-none"
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const ChartViewer = React.memo(ChartViewerComponent);
