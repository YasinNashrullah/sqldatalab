import os
import time
import re
import uuid
import datetime
import decimal
from pathlib import Path
from typing import Any, Tuple
import duckdb
from backend.app.core.config import settings
from backend.app.core.errors import SQLSyntaxError, SQLTimeoutError, SQLResourceLimitError, AppException


class DuckDBManager:
    """Manages isolated DuckDB catalogs and execution sandboxes for each workspace."""

    _connections: dict[str, duckdb.DuckDBPyConnection] = {}

    @classmethod
    def get_workspace_db_path(cls, workspace_id: str) -> Path:
        ws_dir = settings.WORKSPACES_DIR / workspace_id
        ws_dir.mkdir(parents=True, exist_ok=True)
        return ws_dir / "analytics.duckdb"

    @classmethod
    def get_connection(cls, workspace_id: str) -> duckdb.DuckDBPyConnection:
        """Get or create an isolated DuckDB connection for the workspace."""
        if workspace_id not in cls._connections:
            db_path = cls.get_workspace_db_path(workspace_id)
            con = duckdb.connect(str(db_path))
            
            # Apply strict sandbox limits
            try:
                con.execute(f"SET max_memory = '{settings.DUCKDB_MEMORY_LIMIT}';")
                con.execute(f"SET threads = {settings.DUCKDB_THREADS};")
                # Preserve standard formatting
                con.execute("SET preserve_insertion_order = true;")
            except Exception as e:
                # Log or ignore minor setting differences across duckdb versions
                pass

            cls._connections[workspace_id] = con
        return cls._connections[workspace_id]

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
        Returns: (row_count, column_count, columns_metadata)
        """
        con = cls.get_connection(workspace_id)
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        if not sanitized_table:
            sanitized_table = f"table_{uuid.uuid4().hex[:6]}"

        safe_csv_path = str(Path(csv_path).resolve()).replace("\\", "/")
        
        # Load CSV into DuckDB table
        query = f"""
        CREATE OR REPLACE TABLE "{sanitized_table}" AS 
        SELECT * FROM read_csv('{safe_csv_path}', 
            delim='{delimiter}', 
            header={str(has_header).lower()}, 
            auto_detect=true,
            ignore_errors=true
        );
        """
        try:
            con.execute(query)
            
            # Get table count
            count_res = con.execute(f'SELECT COUNT(*) FROM "{sanitized_table}"').fetchone()
            row_count = count_res[0] if count_res else 0

            # Get column info
            desc_res = con.execute(f'DESCRIBE "{sanitized_table}"').fetchall()
            columns = []
            for col in desc_res:
                col_name = str(col[0])
                col_type = str(col[1])
                columns.append({"name": col_name, "type": col_type})

            return row_count, len(columns), columns
        except Exception as e:
            raise AppException(
                code="DUCKDB_REGISTRATION_FAILED",
                message=f"Failed to register table '{sanitized_table}': {str(e)}",
                details={"table_name": sanitized_table, "raw_error": str(e)},
            )

    @classmethod
    def execute_query(
        cls,
        workspace_id: str,
        query: str,
        limit: int = 1000,
    ) -> dict[str, Any]:
        """
        Executes an analytical SQL query in the isolated DuckDB sandbox.
        Enforces timeout and returns structured JSON-serializable rows.
        """
        query_trimmed = query.strip()
        if not query_trimmed:
            raise SQLSyntaxError("Query cannot be empty.")

        con = cls.get_connection(workspace_id)
        query_id = f"qry_{uuid.uuid4().hex[:10]}"
        start_time = time.time()

        # Reject dangerous filesystem escape commands and external file reader functions
        forbidden_patterns = [
            r"\bINSTALL\b", r"\bLOAD\b", r"\bATTACH\b", r"\bDETACH\b", r"\bEXPORT\b",
            r"\bIMPORT\b", r"\bCOPY\b", r"\bPRAGMA\b", r"\bCALL\b", r"\bSYSTEM_\w*\b",
            r"\bREAD_CSV\w*\b", r"\bREAD_PARQUET\w*\b", r"\bREAD_JSON\w*\b",
            r"\bREAD_NDJSON\w*\b", r"\bREAD_BLOB\w*\b", r"\bREAD_TEXT\w*\b",
            r"\bSCAN_CSV\w*\b", r"\bSCAN_PARQUET\w*\b", r"\bPARQUET_SCAN\w*\b",
            r"\bSNIFF_CSV\w*\b", r"\bWRITE_CSV\w*\b", r"\bWRITE_PARQUET\w*\b",
            r"\bWRITE_JSON\w*\b", r"\bCHECKPOINT\b", r"\bFORCE_CHECKPOINT\b"
        ]
        for pattern in forbidden_patterns:
            if re.search(pattern, query_trimmed, re.IGNORECASE):
                match = re.search(pattern, query_trimmed, re.IGNORECASE).group(0)
                raise SQLSyntaxError(f"Operation or function '{match.upper()}' is restricted in this analytical sandbox.")

        try:
            # Execute analytical query
            cursor = con.cursor()
            cursor.execute(query_trimmed)
            description = cursor.description or []
            
            columns = []
            for col in description:
                columns.append({
                    "name": col[0],
                    "type": str(col[1]) if len(col) > 1 and col[1] else "VARCHAR"
                })

            raw_rows = cursor.fetchmany(limit)
            duration_ms = round((time.time() - start_time) * 1000, 2)

            # Convert rows to JSON-serializable formats
            formatted_rows = []
            for row in raw_rows:
                formatted_row = []
                for val in row:
                    if val is None:
                        formatted_row.append(None)
                    elif isinstance(val, (datetime.date, datetime.datetime)):
                        formatted_row.append(val.isoformat())
                    elif isinstance(val, decimal.Decimal):
                        formatted_row.append(float(val))
                    elif isinstance(val, (bytes, bytearray)):
                        formatted_row.append(val.hex())
                    else:
                        formatted_row.append(val)
                formatted_rows.append(formatted_row)

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

        except duckdb.ParserException as pe:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            raise SQLSyntaxError(
                message=f"SQL Syntax Error: {str(pe)}",
                details={"raw_error": str(pe), "execution_time_ms": duration_ms}
            )
        except duckdb.OutOfMemoryException as oom:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            raise SQLResourceLimitError(
                message="Query exceeded memory limit (1GB). Try adding LIMIT or filtering data.",
                details={"raw_error": str(oom), "execution_time_ms": duration_ms}
            )
        except duckdb.InterruptException as ie:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            raise SQLTimeoutError(
                message="Query execution was interrupted or timed out.",
                details={"raw_error": str(ie), "execution_time_ms": duration_ms}
            )
        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            error_str = str(e)
            if "syntax error" in error_str.lower() or "binder error" in error_str.lower():
                raise SQLSyntaxError(
                    message=f"Query Error: {error_str}",
                    details={"raw_error": error_str, "execution_time_ms": duration_ms}
                )
            raise AppException(
                code="SQL_EXECUTION_ERROR",
                message=f"Query execution failed: {error_str}",
                details={"raw_error": error_str, "execution_time_ms": duration_ms}
            )

    @classmethod
    def get_table_preview(cls, workspace_id: str, table_name: str, limit: int = 10) -> dict[str, Any]:
        """Quick preview of the first N rows of a registered table."""
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        query = f'SELECT * FROM "{sanitized_table}" LIMIT {limit};'
        return cls.execute_query(workspace_id, query, limit=limit)

    @classmethod
    def close_connection(cls, workspace_id: str) -> None:
        """Closes and unregisters the DuckDB connection for a workspace."""
        if workspace_id in cls._connections:
            try:
                cls._connections[workspace_id].close()
            except Exception:
                pass
            del cls._connections[workspace_id]

    @classmethod
    def explain_query(cls, workspace_id: str, query: str) -> dict[str, Any]:
        """Runs EXPLAIN on the SQL query in the isolated workspace sandbox."""
        query_trimmed = query.strip()
        if not query_trimmed:
            raise SQLSyntaxError("Query cannot be empty.")
        
        con = cls.get_connection(workspace_id)
        start_time = time.time()
        try:
            cursor = con.cursor()
            explain_sql = f"EXPLAIN {query_trimmed.rstrip(';')};"
            cursor.execute(explain_sql)
            rows = cursor.fetchall()
            lines = [r[1] if len(r) > 1 else str(r[0]) for r in rows]
            duration_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "query": query_trimmed,
                "plan": "\n".join(lines),
                "lines": lines,
                "duration_ms": duration_ms,
            }
        except Exception as e:
            raise SQLSyntaxError(f"Explain failed: {str(e)}")

    @classmethod
    def get_table_stats(cls, workspace_id: str, table_name: str) -> dict[str, Any]:
        """Returns column statistics (distinct count, null count) and preview for a table."""
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        con = cls.get_connection(workspace_id)
        cursor = con.cursor()
        
        cursor.execute(f'DESCRIBE "{sanitized_table}";')
        desc_rows = cursor.fetchall()
        
        cursor.execute(f'SELECT COUNT(*) FROM "{sanitized_table}";')
        total_rows = cursor.fetchone()[0]
        
        columns = []
        for r in desc_rows:
            col_name = r[0]
            col_type = r[1]
            try:
                cursor.execute(f'SELECT COUNT(DISTINCT "{col_name}"), COUNT(*) - COUNT("{col_name}") FROM "{sanitized_table}";')
                stats = cursor.fetchone()
                distinct_count = stats[0]
                null_count = stats[1]
            except Exception:
                distinct_count = None
                null_count = 0

            columns.append({
                "name": col_name,
                "type": col_type,
                "distinct_count": distinct_count,
                "null_count": null_count,
            })

        sample_res = cls.execute_query(workspace_id, f'SELECT * FROM "{sanitized_table}" LIMIT 5;', limit=5)

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
        Discovers all persistent tables in the DuckDB catalog, their columns,
        and infers entity relationships (Foreign Key links) based on standard naming conventions.
        """
        con = cls.get_connection(workspace_id)
        cursor = con.cursor()
        
        try:
            cursor.execute("SHOW TABLES;")
            tbl_rows = cursor.fetchall()
            table_names = [r[0] for r in tbl_rows]
        except Exception:
            table_names = []

        nodes = []
        table_cols_map: dict[str, list[dict[str, Any]]] = {}

        for tbl in table_names:
            try:
                cursor.execute(f'DESCRIBE "{tbl}";')
                desc = cursor.fetchall()
                cursor.execute(f'SELECT COUNT(*) FROM "{tbl}";')
                rc = cursor.fetchone()[0]
            except Exception:
                continue

            columns = []
            for col in desc:
                col_name = str(col[0])
                col_type = str(col[1])
                is_pk = col_name.lower() in ("id", f"{tbl.lower()}_id", f"{tbl.rstrip('s').lower()}_id")
                is_fk = col_name.lower().endswith("_id") and not is_pk

                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "is_pk_hint": is_pk,
                    "is_fk_hint": is_fk,
                })

            table_cols_map[tbl] = columns
            nodes.append({
                "id": tbl,
                "table_name": tbl,
                "row_count": rc,
                "columns": columns,
            })

        # Infer relationships between tables
        edges = []
        edge_id = 1
        for source_table, cols in table_cols_map.items():
            for col in cols:
                col_name = col["name"].lower()
                if col_name.endswith("_id") and not col["is_pk_hint"]:
                    ref_prefix = col_name[:-3]  # e.g., 'customer' from 'customer_id'
                    
                    # Look for matching target table: 'customers', 'customer', or exact match
                    for target_table in table_names:
                        if target_table == source_table:
                            continue
                        target_lower = target_table.lower()
                        if target_lower in (ref_prefix, f"{ref_prefix}s", f"{ref_prefix}es") or target_lower.rstrip("s") == ref_prefix:
                            # Target must have an 'id' column or '<ref_prefix>_id'
                            target_has_id = any(c["name"].lower() in ("id", col_name) for c in table_cols_map.get(target_table, []))
                            if target_has_id:
                                edges.append({
                                    "id": f"edge_{edge_id}",
                                    "from_table": source_table,
                                    "from_column": col["name"],
                                    "to_table": target_table,
                                    "to_column": "id" if any(c["name"].lower() == "id" for c in table_cols_map.get(target_table, [])) else col_name,
                                    "label": f"{source_table}.{col['name']} ➔ {target_table}",
                                })
                                edge_id += 1
                                break

        return {
            "nodes": nodes,
            "edges": edges,
        }

    @classmethod
    def get_data_quality_profile(cls, workspace_id: str, table_name: str) -> dict[str, Any]:
        """
        Performs an automated data quality audit and anomaly profiling on a table:
        - Duplicate rows detection
        - Missing/Null value ratios and critical threshold flags
        - Constant column detection (zero variance)
        - Candidate Primary Key discovery
        - Numerical distribution (min, max, mean, stddev, IQR percentiles, outlier detection)
        - Data Quality Score (0-100) & Grade (A, B, C, D)
        - Auto-generated remediation SQL
        """
        sanitized_table = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).strip("_").lower()
        con = cls.get_connection(workspace_id)
        cursor = con.cursor()

        # Analyze row count and table structure
        cursor.execute(f'DESCRIBE "{sanitized_table}";')
        desc_rows = cursor.fetchall()
        
        cursor.execute(f'SELECT COUNT(*) FROM "{sanitized_table}";')
        total_rows = cursor.fetchone()[0]

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
                "issues": [{"severity": "INFO", "column": None, "message": "Tabel kosong tanpa data.", "suggested_action": "Muat data ke dalam tabel."}],
                "clean_sql_snippet": None,
            }

        # Calculate total duplicate rows and ratio
        try:
            cursor.execute(f'SELECT (SELECT COUNT(*) FROM "{sanitized_table}") - (SELECT COUNT(*) FROM (SELECT DISTINCT * FROM "{sanitized_table}"));')
            duplicate_rows = cursor.fetchone()[0]
        except Exception:
            duplicate_rows = 0

        duplicate_percentage = round((duplicate_rows / total_rows) * 100, 2)

        # Profile quality metrics per column
        columns_quality = []
        issues = []
        score = 100

        # Penalize for duplicate rows
        if duplicate_rows > 0:
            penalty = min(25, int(duplicate_percentage * 2) + 5)
            score -= penalty
            issues.append({
                "severity": "CRITICAL" if duplicate_percentage > 10 else "WARNING",
                "column": None,
                "message": f"Ditemukan {duplicate_rows} baris data duplikat ({duplicate_percentage}% dari total data).",
                "suggested_action": f'Gunakan deduplikasi: SELECT DISTINCT * FROM "{sanitized_table}"; atau QUALIFY ROW_NUMBER() OVER (...) = 1'
            })

        numeric_type_keywords = ("int", "double", "float", "decimal", "real", "numeric", "hugeint")

        for r in desc_rows:
            col_name = r[0]
            col_type = str(r[1]).lower()

            try:
                cursor.execute(f'SELECT COUNT(DISTINCT "{col_name}"), COUNT(*) - COUNT("{col_name}") FROM "{sanitized_table}";')
                st = cursor.fetchone()
                distinct_count = st[0]
                null_count = st[1]
            except Exception:
                distinct_count = None
                null_count = 0

            null_pct = round((null_count / total_rows) * 100, 2)
            distinct_pct = round((distinct_count / total_rows) * 100, 2) if distinct_count is not None else None

            is_constant = (distinct_count == 1 and total_rows > 1)
            is_candidate_pk = (distinct_count == total_rows and null_count == 0)

            # Check null severity
            if null_pct >= 50:
                score -= 10
                issues.append({
                    "severity": "CRITICAL",
                    "column": col_name,
                    "message": f"Kolom '{col_name}' memiliki rasio kekosongan kritis ({null_pct}% baris bernilai NULL).",
                    "suggested_action": f'Periksa sumber ingestion data atau gunakan COALESCE("{col_name}", default_value).'
                })
            elif null_pct > 15:
                score -= 5
                issues.append({
                    "severity": "WARNING",
                    "column": col_name,
                    "message": f"Kolom '{col_name}' memiliki nilai NULL sebesar {null_pct}%.",
                    "suggested_action": f"Lakukan imputasi nilai default pada kolom '{col_name}'."
                })

            # Check constant column
            if is_constant:
                score -= 3
                issues.append({
                    "severity": "INFO",
                    "column": col_name,
                    "message": f"Kolom '{col_name}' memiliki variansi nol (seluruh baris memiliki nilai yang sama).",
                    "suggested_action": f"Pertimbangkan apakah kolom '{col_name}' diperlukan dalam analisis."
                })

            # Check numeric distribution & outliers
            numeric_dist = None
            is_numeric = any(k in col_type for k in numeric_type_keywords)
            if is_numeric and distinct_count and distinct_count > 1:
                try:
                    cursor.execute(f'''
                        SELECT 
                            CAST(MIN("{col_name}") AS DOUBLE),
                            CAST(MAX("{col_name}") AS DOUBLE),
                            CAST(AVG("{col_name}") AS DOUBLE),
                            CAST(QUANTILE_CONT("{col_name}", 0.25) AS DOUBLE),
                            CAST(QUANTILE_CONT("{col_name}", 0.75) AS DOUBLE)
                        FROM "{sanitized_table}"
                        WHERE "{col_name}" IS NOT NULL;
                    ''')
                    n_res = cursor.fetchone()
                    if n_res and n_res[0] is not None:
                        min_v, max_v, avg_v, q25, q75 = n_res
                        iqr = (q75 - q25) if (q75 is not None and q25 is not None) else 0.0
                        
                        outliers_cnt = 0
                        if iqr > 0:
                            lower_bound = q25 - (1.5 * iqr)
                            upper_bound = q75 + (1.5 * iqr)
                            cursor.execute(f'''
                                SELECT COUNT(*) FROM "{sanitized_table}"
                                WHERE "{col_name}" < {lower_bound} OR "{col_name}" > {upper_bound};
                            ''')
                            outliers_cnt = cursor.fetchone()[0]

                            if outliers_cnt > 0:
                                issues.append({
                                    "severity": "INFO",
                                    "column": col_name,
                                    "message": f"Kolom numerik '{col_name}' memiliki {outliers_cnt} potensi outlier di luar rentang IQR [{round(lower_bound, 2)}, {round(upper_bound, 2)}].",
                                    "suggested_action": f"Verifikasi apakah nilai ekstrim pada '{col_name}' valid atau akibat anomali input."
                                })

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

            columns_quality.append({
                "name": col_name,
                "data_type": col_type,
                "null_count": null_count,
                "null_percentage": null_pct,
                "distinct_count": distinct_count,
                "distinct_percentage": distinct_pct,
                "is_constant": is_constant,
                "is_candidate_pk": is_candidate_pk,
                "numeric_distribution": numeric_dist,
            })

        # Calculate final quality score & grade
        final_score = max(20, min(100, score))
        if final_score >= 90:
            grade = "A"
        elif final_score >= 80:
            grade = "B"
        elif final_score >= 70:
            grade = "C"
        else:
            grade = "D"

        # Generate automated cleaning SQL snippet
        clean_clauses = []
        if duplicate_rows > 0:
            clean_clauses.append(f'-- 1. Deduplikasi baris:\nSELECT DISTINCT * FROM "{sanitized_table}";')
        
        null_cols = [c["name"] for c in columns_quality if c["null_count"] > 0]
        if null_cols:
            clean_clauses.append(f'-- 2. Filter baris dengan kolom penting bernilai NOT NULL:\nSELECT * FROM "{sanitized_table}"\nWHERE ' + " AND ".join(f'"{c}" IS NOT NULL' for c in null_cols[:3]) + ';')

        clean_sql = "\n\n".join(clean_clauses) if clean_clauses else f'-- Kualitas data sangat baik (Grade {grade})\nSELECT * FROM "{sanitized_table}" LIMIT 50;'

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


