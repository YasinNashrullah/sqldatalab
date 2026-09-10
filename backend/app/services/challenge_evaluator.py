import logging
from typing import Any
from backend.app.services.duckdb_manager import DuckDBManager
from backend.app.core.errors import SQLSyntaxError

logger = logging.getLogger("datalab.challenge")


class ChallengeEvaluator:
    """Evaluates student SQL queries against reference solution queries deterministically."""

    @classmethod
    def evaluate(
        cls,
        workspace_id: str,
        user_sql: str,
        solution_sql: str,
    ) -> dict[str, Any]:
        """
        Runs both queries in DuckDB and compares row count, columns, and data shapes.
        """
        # Execute user query
        try:
            user_res = DuckDBManager.execute_query(workspace_id, user_sql, limit=500)
        except SQLSyntaxError as se:
            return {
                "is_passed": False,
                "message": f"Syntax or Execution Error in your query: {se.message}",
                "execution_time_ms": 0.0,
                "user_row_count": 0,
                "expected_row_count": 0,
                "user_columns": [],
                "expected_columns": [],
                "sample_user_rows": [],
                "sample_expected_rows": [],
                "diff_details": se.message,
            }
        except Exception as e:
            return {
                "is_passed": False,
                "message": f"Query failed: {str(e)}",
                "execution_time_ms": 0.0,
                "user_row_count": 0,
                "expected_row_count": 0,
                "user_columns": [],
                "expected_columns": [],
                "sample_user_rows": [],
                "sample_expected_rows": [],
                "diff_details": str(e),
            }

        # Execute expected query
        try:
            sol_res = DuckDBManager.execute_query(workspace_id, solution_sql, limit=500)
        except Exception as se:
            logger.error(f"Solution query failed for challenge validation: {se}")
            return {
                "is_passed": False,
                "message": "Unable to validate solution. Please contact administrator.",
                "execution_time_ms": user_res["execution_time_ms"],
                "user_row_count": user_res["row_count"],
                "expected_row_count": 0,
                "user_columns": [c["name"] for c in user_res["columns"]],
                "expected_columns": [],
                "sample_user_rows": user_res["rows"][:5],
                "sample_expected_rows": [],
                "diff_details": "Solution validation failed - this is a system issue, not your fault.",
            }

        user_cols = [c["name"].lower() for c in user_res["columns"]]
        sol_cols = [c["name"].lower() for c in sol_res["columns"]]

        user_rows = user_res["rows"]
        sol_rows = sol_res["rows"]

        # Validate projected column counts
        if len(user_cols) != len(sol_cols):
            return {
                "is_passed": False,
                "message": f"Column count mismatch: Expected {len(sol_cols)} columns, but got {len(user_cols)}.",
                "execution_time_ms": user_res["execution_time_ms"],
                "user_row_count": len(user_rows),
                "expected_row_count": len(sol_rows),
                "user_columns": user_cols,
                "expected_columns": sol_cols,
                "sample_user_rows": user_rows[:5],
                "sample_expected_rows": sol_rows[:5],
                "diff_details": f"Expected columns: {', '.join(sol_cols)}. Your columns: {', '.join(user_cols)}.",
            }

        # Validate total row counts
        if len(user_rows) != len(sol_rows):
            return {
                "is_passed": False,
                "message": f"Row count mismatch: Expected {len(sol_rows)} rows, but your query returned {len(user_rows)} rows.",
                "execution_time_ms": user_res["execution_time_ms"],
                "user_row_count": len(user_rows),
                "expected_row_count": len(sol_rows),
                "user_columns": user_cols,
                "expected_columns": sol_cols,
                "sample_user_rows": user_rows[:5],
                "sample_expected_rows": sol_rows[:5],
                "diff_details": f"Check your WHERE filtering or GROUP BY conditions.",
            }

        # Normalize and compare row contents
        norm_user = sorted([tuple(str(v) for v in r) for r in user_rows])
        norm_sol = sorted([tuple(str(v) for v in r) for r in sol_rows])

        if norm_user != norm_sol:
            return {
                "is_passed": False,
                "message": "The returned data values do not match the expected solution.",
                "execution_time_ms": user_res["execution_time_ms"],
                "user_row_count": len(user_rows),
                "expected_row_count": len(sol_rows),
                "user_columns": user_cols,
                "expected_columns": sol_cols,
                "sample_user_rows": user_rows[:5],
                "sample_expected_rows": sol_rows[:5],
                "diff_details": "Inspect the first 5 sample rows compared to the expected output.",
            }

        return {
            "is_passed": True,
            "message": "Excellent! Your query produced the exact expected output and passed all validation checks.",
            "execution_time_ms": user_res["execution_time_ms"],
            "user_row_count": len(user_rows),
            "expected_row_count": len(sol_rows),
            "user_columns": user_cols,
            "expected_columns": sol_cols,
            "sample_user_rows": user_rows[:5],
            "sample_expected_rows": sol_rows[:5],
            "diff_details": None,
        }
