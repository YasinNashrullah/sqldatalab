export type SnippetCategoryKey = 
  | "window" 
  | "timeseries" 
  | "aggregations" 
  | "analytics" 
  | "cleaning";

export interface SQLSnippet {
  id: string;
  categoryKey: SnippetCategoryKey;
  category: string;
  category_en: string;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  useCase: string;
  useCase_en: string;
  sql: string;
}

export const SQL_SNIPPETS: SQLSnippet[] = [
  {
    id: "snip_running_total",
    categoryKey: "window",
    category: "Window Functions",
    category_en: "Window Functions",
    title: "Cumulative / Running Total",
    title_en: "Cumulative / Running Total",
    description: "Menghitung akumulasi nilai berjalan urut berdasarkan tanggal atau urutan tertentu.",
    description_en: "Calculate cumulative running totals ordered by date or sequential order.",
    useCase: "Analisis akumulasi pendapatan bulanan atau tren saldo akun.",
    useCase_en: "Analyze monthly revenue accumulation or account balance trends.",
    sql: `SELECT 
    order_date,
    amount,
    SUM(amount) OVER (
        ORDER BY order_date 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders
ORDER BY order_date ASC;`,
  },
  {
    id: "snip_moving_avg",
    categoryKey: "window",
    category: "Window Functions",
    category_en: "Window Functions",
    title: "7-Day Moving Average (Rolling Window)",
    title_en: "7-Day Moving Average (Rolling Window)",
    description: "Menghitung rata-rata bergerak 7 periode untuk meredam fluktuasi harian.",
    description_en: "Calculate a 7-period moving average to smooth out daily transaction fluctuations.",
    useCase: "Menghilangkan noise musiman pada volume transaksi harian.",
    useCase_en: "Eliminate seasonal volatility from daily revenue or traffic metrics.",
    sql: `SELECT 
    order_date,
    amount,
    ROUND(AVG(amount) OVER (
        ORDER BY order_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_7d
FROM orders
ORDER BY order_date ASC;`,
  },
  {
    id: "snip_period_growth",
    categoryKey: "window",
    category: "Window Functions",
    category_en: "Window Functions",
    title: "Period-over-Period Growth (LAG)",
    title_en: "Period-over-Period Growth (LAG)",
    description: "Membandingkan nilai periode saat ini dengan periode sebelumnya menggunakan LAG.",
    description_en: "Compare current period metrics against previous periods using LAG window function.",
    useCase: "Menghitung persentase pertumbuhan omset bulan-ke-bulan (MoM Growth).",
    useCase_en: "Calculate month-over-month (MoM) revenue growth percentages.",
    sql: `WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', order_date::DATE) AS sales_month,
        SUM(amount) AS total_revenue
    FROM orders
    GROUP BY 1
)
SELECT 
    sales_month,
    total_revenue,
    LAG(total_revenue, 1) OVER (ORDER BY sales_month) AS prev_month_revenue,
    ROUND(
        (total_revenue - LAG(total_revenue, 1) OVER (ORDER BY sales_month)) 
        / NULLIF(LAG(total_revenue, 1) OVER (ORDER BY sales_month), 0) * 100, 
        2
    ) AS growth_pct
FROM monthly_sales
ORDER BY sales_month ASC;`,
  },
  {
    id: "snip_duckdb_qualify",
    categoryKey: "analytics",
    category: "Analisis Lanjutan",
    category_en: "Advanced Analytics",
    title: "Deduplikasi Baris via DuckDB QUALIFY",
    title_en: "Row Deduplication via DuckDB QUALIFY",
    description: "Fitur super cepat bawaan DuckDB untuk menyaring baris terbaru tanpa subquery bertingkat.",
    description_en: "Ultra-fast DuckDB native feature to filter latest rows without nested subqueries.",
    useCase: "Mengambil hanya data status pesanan atau profil customer paling mutakhir.",
    useCase_en: "Retrieve only the latest order status or most recent customer profile.",
    sql: `SELECT *
FROM orders
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY customer_id 
    ORDER BY order_date DESC
) = 1;`,
  },
  {
    id: "snip_pivot_conditional",
    categoryKey: "aggregations",
    category: "Agregasi & Pivot",
    category_en: "Aggregations & Pivots",
    title: "Pivot / Agregasi Bersyarat (CASE WHEN)",
    title_en: "Conditional Aggregation / Pivot (CASE WHEN)",
    description: "Mengubah nilai baris kategori menjadi kolom metrik ringkasan.",
    description_en: "Transform category rows into summary metric columns using conditional aggregation.",
    useCase: "Menghitung jumlah order dan omzet berdasarkan status atau kategori dalam satu baris.",
    useCase_en: "Compute total orders and category spend summarized side-by-side.",
    sql: `SELECT 
    customer_id,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN category = 'Electronics' THEN amount ELSE 0 END) AS electronics_spend,
    SUM(CASE WHEN category = 'Books' THEN amount ELSE 0 END) AS books_spend,
    COUNT(CASE WHEN amount > 100 THEN 1 END) AS high_value_orders
FROM orders
GROUP BY customer_id
ORDER BY total_orders DESC;`,
  },
  {
    id: "snip_date_trunc",
    categoryKey: "timeseries",
    category: "Time-Series & Tanggal",
    category_en: "Time-Series & Dates",
    title: "Pemotongan & Pengelompokan Tanggal",
    title_en: "Date Truncation & Grouping",
    description: "Memotong timestamp ke batas minggu, bulan, kuartal, atau tahun terdekat.",
    description_en: "Truncate timestamps to the nearest week, month, quarter, or year interval.",
    useCase: "Laporan agregasi mingguan, bulanan, dan kuartalan.",
    useCase_en: "Weekly, monthly, and quarterly aggregate business reporting.",
    sql: `SELECT 
    DATE_TRUNC('month', order_date::DATE) AS month_start,
    COUNT(DISTINCT customer_id) AS active_customers,
    COUNT(*) AS order_volume,
    ROUND(SUM(amount), 2) AS gross_merchandise_value
FROM orders
GROUP BY 1
ORDER BY month_start DESC;`,
  },
  {
    id: "snip_cte_pipeline",
    categoryKey: "analytics",
    category: "Analisis Lanjutan",
    category_en: "Advanced Analytics",
    title: "Multi-Stage CTE Pipeline (Clean Architecture)",
    title_en: "Multi-Stage CTE Pipeline (Clean Architecture)",
    description: "Pipeline query modular berurutan menggunakan Common Table Expressions (CTE).",
    description_en: "Sequential modular query pipeline using Common Table Expressions (CTE).",
    useCase: "Pembersihan data bertahap sebelum kalkulasi metrik akhir.",
    useCase_en: "Staged data cleansing before computing high-level business tiers.",
    sql: `WITH raw_filtered AS (
    SELECT customer_id, amount, order_date
    FROM orders
    WHERE amount > 0
),
customer_aggregates AS (
    SELECT 
        customer_id,
        COUNT(*) AS total_orders,
        SUM(amount) AS lifetime_spend
    FROM raw_filtered
    GROUP BY customer_id
)
SELECT 
    customer_id,
    total_orders,
    lifetime_spend,
    CASE 
        WHEN lifetime_spend >= 500 THEN 'VIP'
        WHEN lifetime_spend >= 200 THEN 'Gold'
        ELSE 'Standard'
    END AS tier
FROM customer_aggregates
ORDER BY lifetime_spend DESC;`,
  },
  {
    id: "snip_quartiles",
    categoryKey: "analytics",
    category: "Analisis Lanjutan",
    category_en: "Advanced Analytics",
    title: "Distribusi Kuartil Pelanggan (NTILE)",
    title_en: "Customer Quartile Distribution (NTILE)",
    description: "Membagi populasi data menjadi 4 kuartil seimbang berdasarkan pembelanjaan.",
    description_en: "Divide dataset into 4 balanced quartiles based on total customer expenditure.",
    useCase: "Segmentasi pelanggan RFM / Kuartil pembeli teratas.",
    useCase_en: "RFM customer segmentation to identify top tier buyers.",
    sql: `SELECT 
    customer_id,
    SUM(amount) AS total_spend,
    NTILE(4) OVER (ORDER BY SUM(amount) DESC) AS spend_quartile
FROM orders
GROUP BY customer_id
ORDER BY total_spend DESC;`,
  },
  {
    id: "snip_data_cleaning_nulls",
    categoryKey: "cleaning",
    category: "Pembersihan Data",
    category_en: "Data Cleaning",
    title: "Penanganan Nilai Null & Default Fallback",
    title_en: "Null Handling & Safe Fallbacks",
    description: "Mengganti nilai NULL dengan default yang aman menggunakan COALESCE dan NULLIF.",
    description_en: "Replace NULL values with safe defaults using COALESCE and NULLIF functions.",
    useCase: "Mencegah error 'Division by Zero' dan menangani data yang hilang.",
    useCase_en: "Prevent division-by-zero errors and cleanly handle missing records.",
    sql: `SELECT 
    id,
    COALESCE(name, 'Unknown Customer') AS clean_name,
    COALESCE(email, 'no-email@domain.com') AS contact_email,
    ROUND(total_sales / NULLIF(total_visits, 0), 2) AS spend_per_visit
FROM customers;`,
  },
  {
    id: "snip_regex_extraction",
    categoryKey: "cleaning",
    category: "Pembersihan Data",
    category_en: "Data Cleaning",
    title: "Ekstraksi Domain & Regex String",
    title_en: "Domain & Regex Pattern Extraction",
    description: "Mengekstrak pola teks (misal: domain email) menggunakan fungsi string regex.",
    description_en: "Extract text patterns (such as email domain) using regex string functions.",
    useCase: "Analisis distribusi penyedia email pengguna (Gmail, Yahoo, dll).",
    useCase_en: "Analyze distribution of user email providers (Gmail, Yahoo, etc.).",
    sql: `SELECT 
    REGEXP_EXTRACT(email, '@([a-zA-Z0-9.-]+)', 1) AS email_domain,
    COUNT(*) AS user_count
FROM customers
GROUP BY 1
ORDER BY user_count DESC;`,
  }
];
