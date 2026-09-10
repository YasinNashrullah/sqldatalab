import re
import uuid
import time
import datetime
import decimal
import threading
from pathlib import Path
from typing import Any, Tuple
import duckdb
from backend.app.core.config import settings
from backend.app.core.errors import (
    SQLSyntaxError,
    SQLTimeoutError,
    SQLResourceLimitError,
    AppException,
)


class DuckDBManager:
    """Manages isolated DuckDB catalogs and execution sandboxes for each workspace."""

    _connections: dict[str, duckdb.DuckDBPyConnection] = {}
    _connection_timestamps: dict[str, float] = {}
    _lock = threading.RLock()
    _workspace_locks: dict[str, threading.Lock] = {}
    _CONNECTION_TTL_SECONDS: int = 1800

    @classmethod
    def _get_workspace_lock(cls, workspace_id: str) -> threading.Lock:
        with cls._lock:
            if workspace_id not in cls._workspace_locks:
                cls._workspace_locks[workspace_id] = threading.Lock()
            return cls._workspace_locks[workspace_id]

    @classmethod
    def get_workspace_db_path(cls, workspace_id: str) -> Path:
        ws_dir = settings.WORKSPACES_DIR / workspace_id
        ws_dir.mkdir(parents=True, exist_ok=True)
        return ws_dir / "analytics.duckdb"

    @classmethod
    def _cleanup_stale_connections(cls):
        """Remove connections that have exceeded their time-to-live."""
        current_time = time.time()
        stale = [
            ws_id
            for ws_id, ts in cls._connection_timestamps.items()
            if current_time - ts > cls._CONNECTION_TTL_SECONDS
        ]
        for ws_id in stale:
            cls.close_connection(ws_id)

    @classmethod
    def _apply_sandbox_settings(cls, con: duckdb.DuckDBPyConnection) -> None:
        """Apply resource limits to a DuckDB connection.
        Note: read_csv filesystem access is intentionally allowed here because
        the backend uses it internally to load uploaded CSV files into tables.
        User queries are restricted from calling read_csv/read_parquet etc.
        via the _FORBIDDEN_PATTERNS blocklist in execute_query.
        """
        settings_map = [
            f"SET max_memory = '{settings.DUCKDB_MEMORY_LIMIT}';",
            f"SET threads = {settings.DUCKDB_THREADS};",
            "SET preserve_insertion_order = true;",
        ]
        for stmt in settings_map:
            try:
                con.execute(stmt)
            except Exception:
                pass

    @classmethod
    def get_connection(cls, workspace_id: str) -> duckdb.DuckDBPyConnection:
        """Get or create an isolated DuckDB connection for the workspace."""
        with cls._lock:
            cls._cleanup_stale_connections()
            if workspace_id not in cls._connections:
                db_path = cls.get_workspace_db_path(workspace_id)
                con = duckdb.connect(str(db_path))
                cls._apply_sandbox_settings(con)
                cls._connections[workspace_id] = con
            cls._connection_timestamps[workspace_id] = time.time()
            return cls._connections[workspace_id]

    @classmethod
    def restore_workspace_tables(cls, workspace_id: str, datasets: list[dict]) -> None:
        """
        Re-register CSV tables into DuckDB for a workspace after a server restart.
        DuckDB stores tables persistently in the .duckdb file, so in most cases tables
        survive restarts automatically. This method handles edge cases where the catalog
        may be out of sync (e.g. database file was replaced or moved).

        Each dataset dict must have keys: table_name, storage_path, delimiter (optional).
        storage_path can be either a CSV file path or a directory path.
        """
        if not datasets:
            return
        con = cls.get_connection(workspace_id)

        # Get list of tables currently in DuckDB catalog
        try:
            existing = {r[0].lower() for r in con.execute("SHOW TABLES").fetchall()}
        except Exception:
            existing = set()

        for ds in datasets:
            table_name = ds.get("table_name")
            storage_path = ds.get("storage_path")
            delimiter = ds.get("delimiter", ",")
            if not table_name or not storage_path:
                continue

            # Skip if table already exists in DuckDB catalog (has persistent data)
            if table_name.lower() in existing:
                # Verify it actually has rows — if not, we may need to re-register
                try:
                    count = con.execute(
                        f'SELECT COUNT(*) FROM "{table_name}"'
                    ).fetchone()[0]
                    if count > 0:
                        continue
                except Exception:
                    pass

            # Resolve CSV path — storage_path may be a file or a directory
            csv_path = Path(storage_path)
            if csv_path.is_dir():
                # For directory-based datasets, look for a matching CSV inside
                candidates = list(csv_path.glob(f"{table_name}.*"))
                if not candidates:
                    candidates = list(csv_path.glob("*.csv")) + list(
                        csv_path.glob("*.tsv")
                    )
                if not candidates:
                    continue
                csv_path = candidates[0]

            if not csv_path.exists() or csv_path.suffix.lower() not in (
                ".csv",
                ".tsv",
                ".txt",
            ):
                continue

            try:
                safe_path = str(csv_path.resolve()).replace("\\", "/")
                allowed_delimiters = {",", "\t", ";", "|"}
                if delimiter not in allowed_delimiters:
                    delimiter = ","
                safe_delim = delimiter.replace("'", "''")
                con.execute(f"""
                    CREATE OR REPLACE TABLE "{table_name}" AS
                    SELECT * FROM read_csv('{safe_path}',
                        delim='{safe_delim}',
                        header=true,
                        auto_detect=true,
                        ignore_errors=false
                    );
                """)
            except Exception:
                pass

    @classmethod
    def register_csv_table(
        cls,
        workspace_id: str,
        table_name: str,
        csv_path: str,
        delimiter: str = ",",
        has_header: bool = True,
    ) -> Tuple[int, int, list[dict[str, str]]]:
        """
        Registers a CSV file as a persistent table in the workspace DuckDB catalog.
        Returns a tuple of (row_count, column_count, columns_metadata).
        """
        con = cls.get_connection(workspace_id)
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        if not sanitized_table:
            sanitized_table = f"table_{uuid.uuid4().hex[:6]}"

        safe_csv_path = str(Path(csv_path).resolve()).replace("\\", "/")

        allowed_delimiters = {",", "\t", ";", "|"}
        if delimiter not in allowed_delimiters:
            delimiter = ","

        safe_delimiter = delimiter.replace("'", "''")

        query = f"""
        CREATE OR REPLACE TABLE "{sanitized_table}" AS
        SELECT * FROM read_csv('{safe_csv_path}',
            delim='{safe_delimiter}',
            header={str(has_header).lower()},
            auto_detect=true,
            ignore_errors=false
        );
        """
        try:
            with cls._get_workspace_lock(workspace_id):
                con.execute(query)
                count_res = con.execute(
                    f'SELECT COUNT(*) FROM "{sanitized_table}"'
                ).fetchone()
                row_count = count_res[0] if count_res else 0
                desc_res = con.execute(f'DESCRIBE "{sanitized_table}"').fetchall()
                columns = [
                    {"name": str(col[0]), "type": str(col[1])} for col in desc_res
                ]

            if row_count == 0:
                raise AppException(
                    code="EMPTY_CSV_DATA",
                    message=f"CSV file '{table_name}' was uploaded but contains no data rows. Please verify the file format and content.",
                    details={"table_name": sanitized_table, "csv_path": csv_path},
                )

            return row_count, len(columns), columns
        except Exception as e:
            raise AppException(
                code="DUCKDB_REGISTRATION_FAILED",
                message=f"Failed to register table '{sanitized_table}': {str(e)}",
                details={"table_name": sanitized_table, "raw_error": str(e)},
            )

    _FORBIDDEN_PATTERNS = [
        r"\bINSTALL\b",
        r"\bLOAD\b",
        r"\bATTACH\b",
        r"\bDETACH\b",
        r"\bEXPORT\b",
        r"\bIMPORT\b",
        r"\bCOPY\b",
        r"\bPRAGMA\b",
        r"\bCALL\b",
        r"\bSYSTEM_\w*\b",
        r"\bREAD_CSV\w*\b",
        r"\bREAD_PARQUET\w*\b",
        r"\bREAD_JSON\w*\b",
        r"\bREAD_NDJSON\w*\b",
        r"\bREAD_BLOB\w*\b",
        r"\bREAD_TEXT\w*\b",
        r"\bSCAN_CSV\w*\b",
        r"\bSCAN_PARQUET\w*\b",
        r"\bPARQUET_SCAN\w*\b",
        r"\bSNIFF_CSV\w*\b",
        r"\bWRITE_CSV\w*\b",
        r"\bWRITE_PARQUET\w*\b",
        r"\bWRITE_JSON\w*\b",
        r"\bCHECKPOINT\b",
        r"\bFORCE_CHECKPOINT\b",
    ]

    @classmethod
    def _check_forbidden_patterns(cls, query: str) -> None:
        """Raise SQLSyntaxError if the query contains any restricted operations."""
        for pattern in cls._FORBIDDEN_PATTERNS:
            match = re.search(pattern, query, re.IGNORECASE)
            if match:
                raise SQLSyntaxError(
                    f"Operation '{match.group(0).upper()}' is restricted in this analytical sandbox."
                )

    @classmethod
    def _serialize_row(cls, row: tuple) -> list:
        """Convert a raw DuckDB result row to a JSON-serializable list."""
        serialized = []
        for val in row:
            if val is None:
                serialized.append(None)
            elif isinstance(val, (datetime.date, datetime.datetime)):
                serialized.append(val.isoformat())
            elif isinstance(val, decimal.Decimal):
                serialized.append(float(val))
            elif isinstance(val, (bytes, bytearray)):
                serialized.append(val.hex())
            else:
                serialized.append(val)
        return serialized

    @classmethod
    def execute_query(
        cls,
        workspace_id: str,
        query: str,
        limit: int = 1000,
    ) -> dict[str, Any]:
        """
        Executes an analytical SQL query in the isolated DuckDB sandbox.
        Enforces a timeout via a background thread and returns structured JSON-serializable rows.
        """
        query_trimmed = query.strip()
        if not query_trimmed:
            raise SQLSyntaxError("Query cannot be empty.")

        cls._check_forbidden_patterns(query_trimmed)

        query_id = f"qry_{uuid.uuid4().hex[:10]}"
        start_time = time.time()

        result_holder: dict[str, Any] = {}
        exception_holder: list[Exception] = []

        def run_query():
            try:
                con = cls.get_connection(workspace_id)
                with cls._get_workspace_lock(workspace_id):
                    result = con.execute(query_trimmed)
                    description = result.description or []
                    columns = [
                        {
                            "name": col[0],
                            "type": str(col[1])
                            if len(col) > 1 and col[1]
                            else "VARCHAR",
                        }
                        for col in description
                    ]
                    raw_rows = result.fetchmany(limit)
                result_holder["columns"] = columns
                result_holder["rows"] = [cls._serialize_row(row) for row in raw_rows]
            except Exception as exc:
                exception_holder.append(exc)

        thread = threading.Thread(target=run_query, daemon=True)
        thread.start()
        thread.join(timeout=settings.QUERY_TIMEOUT_SECONDS)

        if thread.is_alive():
            duration_ms = round((time.time() - start_time) * 1000, 2)
            raise SQLTimeoutError(
                message=f"Query exceeded timeout limit of {settings.QUERY_TIMEOUT_SECONDS} seconds.",
                details={
                    "timeout_seconds": settings.QUERY_TIMEOUT_SECONDS,
                    "execution_time_ms": duration_ms,
                },
            )

        if exception_holder:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            exc = exception_holder[0]
            if isinstance(exc, duckdb.ParserException):
                raise SQLSyntaxError(
                    message=f"SQL Syntax Error: {str(exc)}",
                    details={"raw_error": str(exc), "execution_time_ms": duration_ms},
                )
            if isinstance(exc, duckdb.OutOfMemoryException):
                raise SQLResourceLimitError(
                    message="Query exceeded memory limit (1GB). Try adding LIMIT or filtering data.",
                    details={"raw_error": str(exc), "execution_time_ms": duration_ms},
                )
            error_str = str(exc)
            if (
                "syntax error" in error_str.lower()
                or "binder error" in error_str.lower()
            ):
                raise SQLSyntaxError(
                    message=f"Query Error: {error_str}",
                    details={"raw_error": error_str, "execution_time_ms": duration_ms},
                )
            raise AppException(
                code="SQL_EXECUTION_ERROR",
                message=f"Query execution failed: {error_str}",
                details={"raw_error": error_str, "execution_time_ms": duration_ms},
            )

        duration_ms = round((time.time() - start_time) * 1000, 2)
        columns = result_holder.get("columns", [])
        formatted_rows = result_holder.get("rows", [])

        return {
            "query_id": query_id,
            "status": "SUCCESS",
            "execution_time_ms": duration_ms,
            "row_count": len(formatted_rows),
            "total_rows_estimate": len(formatted_rows),
            "columns": columns,
            "rows": formatted_rows,
            "error": None,
        }

    @classmethod
    def get_table_preview(
        cls, workspace_id: str, table_name: str, limit: int = 10
    ) -> dict[str, Any]:
        """Return the first N rows of a registered table as a query result."""
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        query = f'SELECT * FROM "{sanitized_table}" LIMIT {limit};'
        return cls.execute_query(workspace_id, query, limit=limit)

    @classmethod
    def close_connection(cls, workspace_id: str) -> None:
        """Close and unregister the DuckDB connection for a workspace."""
        with cls._lock:
            if workspace_id in cls._connections:
                try:
                    cls._connections[workspace_id].close()
                except Exception:
                    pass
                del cls._connections[workspace_id]
            if workspace_id in cls._connection_timestamps:
                del cls._connection_timestamps[workspace_id]

    @classmethod
    def explain_query(cls, workspace_id: str, query: str) -> dict[str, Any]:
        """Run EXPLAIN on a SQL query inside the isolated workspace sandbox."""
        query_trimmed = query.strip()
        if not query_trimmed:
            raise SQLSyntaxError("Query cannot be empty.")

        cls._check_forbidden_patterns(query_trimmed)

        con = cls.get_connection(workspace_id)
        start_time = time.time()
        try:
            with cls._get_workspace_lock(workspace_id):
                explain_sql = f"EXPLAIN {query_trimmed.rstrip(';')};"
                con.execute(explain_sql)
                rows = con.fetchall()
            lines = [r[1] if len(r) > 1 else str(r[0]) for r in rows]
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "query": query_trimmed,
                "plan": "\n".join(lines),
                "lines": lines,
                "duration_ms": duration_ms,
            }
        except Exception as exc:
            raise SQLSyntaxError(f"Explain failed: {str(exc)}")

    @classmethod
    def get_table_stats(cls, workspace_id: str, table_name: str) -> dict[str, Any]:
        """Return column statistics (distinct count, null count) and a sample preview for a table."""
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        con = cls.get_connection(workspace_id)

        with cls._get_workspace_lock(workspace_id):
            con.execute(f'DESCRIBE "{sanitized_table}";')
            desc_rows = con.fetchall()
            con.execute(f'SELECT COUNT(*) FROM "{sanitized_table}";')
            total_rows = con.fetchone()[0]

        columns = []
        for r in desc_rows:
            col_name = r[0]
            col_name_safe = str(col_name).replace('"', '""')
            col_type = r[1]
            try:
                with cls._get_workspace_lock(workspace_id):
                    con.execute(
                        f'SELECT COUNT(DISTINCT "{col_name_safe}"), COUNT(*) - COUNT("{col_name_safe}") FROM "{sanitized_table}";'
                    )
                    stats = con.fetchone()
                distinct_count = stats[0]
                null_count = stats[1]
            except Exception:
                distinct_count = None
                null_count = 0

            columns.append(
                {
                    "name": col_name,
                    "type": col_type,
                    "distinct_count": distinct_count,
                    "null_count": null_count,
                }
            )

        sample_res = cls.execute_query(
            workspace_id, f'SELECT * FROM "{sanitized_table}" LIMIT 5;', limit=5
        )

        return {
            "table_name": sanitized_table,
            "total_rows": total_rows,
            "columns": columns,
            "sample_rows": sample_res.get("rows", []),
            "sample_columns": sample_res.get("columns", []),
        }

    @classmethod
    def get_schema_graph(cls, workspace_id: str) -> dict[str, Any]:
        """
        Discover all persistent tables in the DuckDB catalog and infer entity relationships
        based on standard column naming conventions (foreign key heuristics).
        """
        con = cls.get_connection(workspace_id)

        try:
            with cls._get_workspace_lock(workspace_id):
                con.execute("SHOW TABLES;")
                tbl_rows = con.fetchall()
            table_names = [r[0] for r in tbl_rows]
        except Exception:
            table_names = []

        nodes = []
        table_cols_map: dict[str, list[dict[str, Any]]] = {}

        for tbl in table_names:
            try:
                with cls._get_workspace_lock(workspace_id):
                    con.execute(f'DESCRIBE "{tbl}";')
                    desc = con.fetchall()
                    con.execute(f'SELECT COUNT(*) FROM "{tbl}";')
                    rc = con.fetchone()[0]
            except Exception:
                continue

            columns = [
                {
                    "name": str(col[0]),
                    "type": str(col[1]),
                    "is_pk_hint": False,
                    "is_fk_hint": False,
                }
                for col in desc
            ]
            table_cols_map[tbl] = columns
            nodes.append(
                {"id": tbl, "table_name": tbl, "row_count": rc, "columns": columns}
            )

        pk_map: dict[str, str] = {}
        for tbl, cols in table_cols_map.items():
            col_names_lower = [c["name"].lower() for c in cols]
            tbl_lower = tbl.lower()
            candidates = [
                "id",
                f"{tbl_lower}_id",
                f"{tbl_lower.rstrip('s')}_id",
                f"{tbl_lower.rstrip('es')}_id",
            ]
            found_pk = None
            for cand in candidates:
                if cand in col_names_lower:
                    found_pk = cols[col_names_lower.index(cand)]["name"]
                    break
            if not found_pk and cols:
                for c in cols:
                    c_low = c["name"].lower()
                    if (
                        c_low in ("sku", "code", "hub_id", "record_id", "tracking_no")
                        or c_low.endswith("_id")
                        or c_low.endswith("_no")
                    ):
                        found_pk = c["name"]
                        break
            if not found_pk and cols:
                found_pk = cols[0]["name"]
            if found_pk:
                pk_map[tbl] = found_pk
                for c in cols:
                    if c["name"] == found_pk:
                        c["is_pk_hint"] = True

        edges = []
        edge_id = 1
        for source_table, cols in table_cols_map.items():
            src_pk = pk_map.get(source_table)
            for col in cols:
                c_name = col["name"]
                c_low = c_name.lower()
                if c_name == src_pk:
                    continue
                for target_table in table_names:
                    if target_table == source_table:
                        continue
                    tgt_pk = pk_map.get(target_table)
                    if tgt_pk and c_low == tgt_pk.lower():
                        col["is_fk_hint"] = True
                        edges.append(
                            {
                                "id": f"edge_{edge_id}",
                                "from_table": source_table,
                                "from_column": c_name,
                                "to_table": target_table,
                                "to_column": tgt_pk,
                                "label": f"{source_table}.{c_name} to {target_table}.{tgt_pk}",
                            }
                        )
                        edge_id += 1
                        break
                    if c_low.endswith("_id"):
                        ref_prefix = c_low[:-3]
                        tgt_low = target_table.lower()
                        if (
                            tgt_low in (ref_prefix, f"{ref_prefix}s", f"{ref_prefix}es")
                            or tgt_low.rstrip("s") == ref_prefix
                        ):
                            target_col = tgt_pk if tgt_pk else c_name
                            col["is_fk_hint"] = True
                            edges.append(
                                {
                                    "id": f"edge_{edge_id}",
                                    "from_table": source_table,
                                    "from_column": c_name,
                                    "to_table": target_table,
                                    "to_column": target_col,
                                    "label": f"{source_table}.{c_name} to {target_table}.{target_col}",
                                }
                            )
                            edge_id += 1
                            break
                    if (
                        tgt_pk
                        and tgt_pk.lower().endswith("_id")
                        and c_low.endswith(tgt_pk.lower())
                    ):
                        col["is_fk_hint"] = True
                        edges.append(
                            {
                                "id": f"edge_{edge_id}",
                                "from_table": source_table,
                                "from_column": c_name,
                                "to_table": target_table,
                                "to_column": tgt_pk,
                                "label": f"{source_table}.{c_name} to {target_table}.{tgt_pk}",
                            }
                        )
                        edge_id += 1
                        break

        return {"nodes": nodes, "edges": edges}

    @classmethod
    def get_data_quality_profile(
        cls, workspace_id: str, table_name: str
    ) -> dict[str, Any]:
        """
        Perform an automated data quality audit on a table.
        Covers duplicate rows, null ratios, constant columns, PK candidates,
        numerical distribution, outlier detection, and a quality score with grade.
        """
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        con = cls.get_connection(workspace_id)

        with cls._get_workspace_lock(workspace_id):
            con.execute(f'DESCRIBE "{sanitized_table}";')
            desc_rows = con.fetchall()
            con.execute(f'SELECT COUNT(*) FROM "{sanitized_table}";')
            total_rows = con.fetchone()[0]

        if total_rows == 0:
            return {
                "table_name": sanitized_table,
                "total_rows": 0,
                "total_columns": len(desc_rows),
                "duplicate_rows": 0,
                "duplicate_percentage": 0.0,
                "quality_score": 100,
                "quality_grade": "A",
                "columns": [],
                "issues": [
                    {
                        "severity": "INFO",
                        "column": None,
                        "message": "Tabel kosong tanpa data.",
                        "suggested_action": "Muat data ke dalam tabel.",
                    }
                ],
                "clean_sql_snippet": None,
            }

        try:
            with cls._get_workspace_lock(workspace_id):
                con.execute(
                    f'SELECT (SELECT COUNT(*) FROM "{sanitized_table}") - '
                    f'(SELECT COUNT(*) FROM (SELECT DISTINCT * FROM "{sanitized_table}"));'
                )
                duplicate_rows = con.fetchone()[0]
        except Exception:
            duplicate_rows = 0

        duplicate_percentage = round((duplicate_rows / total_rows) * 100, 2)
        columns_quality = []
        issues = []
        score = 100

        if duplicate_rows > 0:
            penalty = min(25, int(duplicate_percentage * 2) + 5)
            score -= penalty
            issues.append(
                {
                    "severity": "CRITICAL" if duplicate_percentage > 10 else "WARNING",
                    "column": None,
                    "message": f"Ditemukan {duplicate_rows} baris data duplikat ({duplicate_percentage}% dari total data).",
                    "suggested_action": f'Gunakan deduplikasi: SELECT DISTINCT * FROM "{sanitized_table}";',
                }
            )

        numeric_type_keywords = (
            "int",
            "double",
            "float",
            "decimal",
            "real",
            "numeric",
            "hugeint",
        )

        for r in desc_rows:
            col_name = r[0]
            col_name_safe = str(col_name).replace('"', '""')
            col_type = str(r[1]).lower()

            try:
                with cls._get_workspace_lock(workspace_id):
                    con.execute(
                        f'SELECT COUNT(DISTINCT "{col_name_safe}"), COUNT(*) - COUNT("{col_name_safe}") FROM "{sanitized_table}";'
                    )
                    st = con.fetchone()
                distinct_count = st[0]
                null_count = st[1]
            except Exception:
                distinct_count = None
                null_count = 0

            null_pct = round((null_count / total_rows) * 100, 2)
            distinct_pct = (
                round((distinct_count / total_rows) * 100, 2)
                if distinct_count is not None
                else None
            )
            is_constant = distinct_count == 1 and total_rows > 1
            is_candidate_pk = distinct_count == total_rows and null_count == 0

            if null_pct >= 50:
                score -= 10
                issues.append(
                    {
                        "severity": "CRITICAL",
                        "column": col_name,
                        "message": f"Kolom '{col_name}' memiliki rasio kekosongan kritis ({null_pct}% baris bernilai NULL).",
                        "suggested_action": f'Periksa sumber data atau gunakan COALESCE("{col_name}", default_value).',
                    }
                )
            elif null_pct > 15:
                score -= 5
                issues.append(
                    {
                        "severity": "WARNING",
                        "column": col_name,
                        "message": f"Kolom '{col_name}' memiliki nilai NULL sebesar {null_pct}%.",
                        "suggested_action": f"Lakukan imputasi nilai default pada kolom '{col_name}'.",
                    }
                )

            if is_constant:
                score -= 3
                issues.append(
                    {
                        "severity": "INFO",
                        "column": col_name,
                        "message": f"Kolom '{col_name}' memiliki variansi nol (semua baris bernilai sama).",
                        "suggested_action": f"Pertimbangkan apakah kolom '{col_name}' diperlukan dalam analisis.",
                    }
                )

            numeric_dist = None
            is_numeric = any(k in col_type for k in numeric_type_keywords)
            if is_numeric and distinct_count and distinct_count > 1:
                try:
                    with cls._get_workspace_lock(workspace_id):
                        con.execute(f"""
                            SELECT
                                CAST(MIN("{col_name_safe}") AS DOUBLE),
                                CAST(MAX("{col_name_safe}") AS DOUBLE),
                                CAST(AVG("{col_name_safe}") AS DOUBLE),
                                CAST(QUANTILE_CONT("{col_name_safe}", 0.25) AS DOUBLE),
                                CAST(QUANTILE_CONT("{col_name_safe}", 0.75) AS DOUBLE)
                            FROM "{sanitized_table}"
                            WHERE "{col_name_safe}" IS NOT NULL;
                        """)
                        n_res = con.fetchone()
                    if n_res and n_res[0] is not None:
                        min_v, max_v, avg_v, q25, q75 = n_res
                        iqr = (
                            (q75 - q25)
                            if (q75 is not None and q25 is not None)
                            else 0.0
                        )
                        outliers_cnt = 0
                        if iqr > 0 and q25 is not None and q75 is not None:
                            lower_bound = q25 - (1.5 * iqr)
                            upper_bound = q75 + (1.5 * iqr)
                            with cls._get_workspace_lock(workspace_id):
                                con.execute(f"""
                                    SELECT COUNT(*) FROM "{sanitized_table}"
                                    WHERE "{col_name_safe}" < {lower_bound}
                                       OR "{col_name_safe}" > {upper_bound};
                                """)
                                outliers_cnt = con.fetchone()[0]
                            if outliers_cnt > 0:
                                issues.append(
                                    {
                                        "severity": "INFO",
                                        "column": col_name,
                                        "message": f"Kolom numerik '{col_name}' memiliki {outliers_cnt} potensi outlier di luar rentang IQR [{round(lower_bound, 2)}, {round(upper_bound, 2)}].",
                                        "suggested_action": f"Verifikasi apakah nilai ekstrim pada '{col_name}' valid atau anomali.",
                                    }
                                )
                        numeric_dist = {
                            "min_val": round(min_v, 2) if min_v is not None else None,
                            "max_val": round(max_v, 2) if max_v is not None else None,
                            "avg_val": round(avg_v, 2) if avg_v is not None else None,
                            "q25": round(q25, 2) if q25 is not None else None,
                            "q75": round(q75, 2) if q75 is not None else None,
                            "iqr": round(iqr, 2) if iqr is not None else None,
                            "outliers_count": outliers_cnt,
                        }
                except Exception:
                    pass

            columns_quality.append(
                {
                    "name": col_name,
                    "data_type": col_type,
                    "null_count": null_count,
                    "null_percentage": null_pct,
                    "distinct_count": distinct_count,
                    "distinct_percentage": distinct_pct,
                    "is_constant": is_constant,
                    "is_candidate_pk": is_candidate_pk,
                    "numeric_distribution": numeric_dist,
                }
            )

        final_score = max(20, min(100, score))
        if final_score >= 90:
            grade = "A"
        elif final_score >= 80:
            grade = "B"
        elif final_score >= 70:
            grade = "C"
        else:
            grade = "D"

        clean_clauses = []
        if duplicate_rows > 0:
            clean_clauses.append(
                f'-- Deduplikasi baris\nSELECT DISTINCT * FROM "{sanitized_table}";'
            )
        null_cols = [c["name"] for c in columns_quality if c["null_count"] > 0]
        if null_cols:
            clean_clauses.append(
                f'-- Filter baris tidak null pada kolom penting\nSELECT * FROM "{sanitized_table}"\nWHERE '
                + " AND ".join(f'"{c}" IS NOT NULL' for c in null_cols[:3])
                + ";"
            )

        clean_sql = (
            "\n\n".join(clean_clauses)
            if clean_clauses
            else f'-- Kualitas data sangat baik (Grade {grade})\nSELECT * FROM "{sanitized_table}" LIMIT 50;'
        )

        return {
            "table_name": sanitized_table,
            "total_rows": total_rows,
            "total_columns": len(columns_quality),
            "duplicate_rows": duplicate_rows,
            "duplicate_percentage": duplicate_percentage,
            "quality_score": final_score,
            "quality_grade": grade,
            "columns": columns_quality,
            "issues": issues,
            "clean_sql_snippet": clean_sql,
        }
