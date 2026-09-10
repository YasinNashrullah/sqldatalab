import json
import re
from pathlib import Path
from typing import Any


class TemplateLoader:
    """Helper untuk load dan parse dataset templates dari struktur baru (manifest.json + schema.sql)"""

    @staticmethod
    def load_manifest(folder: Path) -> dict[str, Any] | None:
        """Load manifest.json dari folder dataset template"""
        manifest_path = folder / "manifest.json"
        if not manifest_path.exists():
            return None

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    @staticmethod
    def parse_schema_sql(folder: Path) -> tuple[list[dict], str]:
        """
        Parse schema.sql untuk extract table definitions dan full SQL content.
        Returns: (tables_info, full_sql_content)
        """
        schema_path = folder / "schema.sql"
        if not schema_path.exists():
            return [], ""

        try:
            with open(schema_path, "r", encoding="utf-8") as f:
                sql_content = f.read()
        except Exception:
            return [], ""

        tables_info = []

        create_table_pattern = re.compile(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?(\w+)[`\"]?\s*\(",
            re.IGNORECASE | re.MULTILINE,
        )

        matches = create_table_pattern.finditer(sql_content)

        for match in matches:
            table_name = match.group(1).lower()

            start_pos = match.end()
            paren_count = 1
            end_pos = start_pos

            while end_pos < len(sql_content) and paren_count > 0:
                if sql_content[end_pos] == "(":
                    paren_count += 1
                elif sql_content[end_pos] == ")":
                    paren_count -= 1
                end_pos += 1

            table_def = sql_content[start_pos : end_pos - 1]

            columns = []
            col_pattern = re.compile(
                r"^\s*[`\"]?(\w+)[`\"]?\s+(\w+(?:\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?)",
                re.MULTILINE,
            )

            for col_match in col_pattern.finditer(table_def):
                col_name = col_match.group(1)
                col_type = col_match.group(2)

                if col_name.upper() not in (
                    "PRIMARY",
                    "FOREIGN",
                    "UNIQUE",
                    "CHECK",
                    "CONSTRAINT",
                    "KEY",
                    "INDEX",
                ):
                    columns.append({"name": col_name, "type": col_type})

            insert_pattern = re.compile(
                rf"INSERT\s+INTO\s+[`\"]?{table_name}[`\"]?.*?VALUES\s*\((.*?)\)",
                re.IGNORECASE | re.DOTALL,
            )

            insert_matches = list(insert_pattern.finditer(sql_content))
            row_count = len(insert_matches)

            tables_info.append(
                {
                    "table_name": table_name,
                    "columns": columns,
                    "column_count": len(columns),
                    "row_count": row_count,
                }
            )

        return tables_info, sql_content

    @staticmethod
    def generate_sample_query(
        tables_info: list[dict], manifest: dict | None = None
    ) -> str:
        """Generate sample SQL query berdasarkan table structure"""
        if not tables_info:
            return "SELECT 1;"

        if manifest and "sample_query" in manifest:
            return manifest["sample_query"]

        table_names = [t["table_name"] for t in tables_info]

        if len(table_names) >= 2:
            primary_table = table_names[0]

            for t in tables_info:
                if t["table_name"] == primary_table:
                    primary_cols = t.get("columns", [])
                    break
            else:
                primary_cols = []

            for secondary_table in table_names[1:]:
                for col in primary_cols:
                    col_name = col["name"].lower()

                    if col_name.endswith("_id") or col_name in ("id", "code", "key"):
                        return f"""SELECT a.*, b.* 
FROM {primary_table} a 
JOIN {secondary_table} b ON a.{col["name"]} = b.{col["name"]} 
LIMIT 10;"""

        return f"SELECT * FROM {table_names[0]} LIMIT 10;"

    @staticmethod
    def load_readme(folder: Path) -> str:
        """Load README.md content"""
        readme_path = folder / "README.md"
        if not readme_path.exists():
            return ""

        try:
            with open(readme_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return ""
