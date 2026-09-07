import csv
import io
import re
from pathlib import Path
from typing import Any, Tuple
import duckdb
from backend.app.core.errors import CSVParseError


class CSVSniffer:
    """Intelligent sniffer for CSV delimiters, encoding, BOM cleanup, and type inference."""

    CANDIDATE_DELIMITERS = [",", ";", "\t", "|"]

    @classmethod
    def clean_utf8_bom(cls, content: bytes) -> str:
        """Strip UTF-8 BOM if present and decode safely."""
        if content.startswith(b"\xef\xbb\xbf"):
            content = content[3:]
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                return content.decode("latin-1")
            except Exception as e:
                raise CSVParseError(f"Unable to decode CSV file encoding: {str(e)}")

    @classmethod
    def sniff_delimiter(cls, sample_text: str) -> str:
        """Detect the delimiter from a sample of text."""
        lines = [line for line in sample_text.splitlines() if line.strip()][:20]
        if not lines:
            return ","

        first_line = lines[0]
        counts = {delim: first_line.count(delim) for delim in cls.CANDIDATE_DELIMITERS}
        best_delim = max(counts, key=counts.get)
        if counts[best_delim] > 0:
            return best_delim

        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff("\n".join(lines))
            return dialect.delimiter
        except Exception:
            return ","

    @classmethod
    def sanitize_column_name(cls, col_name: str, index: int, existing_names: set[str]) -> str:
        """Sanitize column name, handle empty, duplicate, or special characters."""
        cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", col_name).strip("_").lower()
        if not cleaned:
            cleaned = f"column_{index + 1}"
        
        # Deduplicate
        final_name = cleaned
        counter = 1
        while final_name in existing_names:
            final_name = f"{cleaned}_{counter}"
            counter += 1
        
        existing_names.add(final_name)
        return final_name

    @classmethod
    def inspect_file(
        cls,
        file_path: Path,
    ) -> Tuple[str, bool, list[dict[str, Any]], list[list[Any]]]:
        """
        Inspects a CSV file on disk.
        Returns: (detected_delimiter, has_header, columns_info, sample_rows)
        """
        if not file_path.exists() or file_path.stat().st_size == 0:
            raise CSVParseError("The uploaded CSV file is empty (0 bytes).")

        # Read first 64KB for sniffing
        with open(file_path, "rb") as f:
            raw_sample = f.read(65536)

        text_sample = cls.clean_utf8_bom(raw_sample)
        delimiter = cls.sniff_delimiter(text_sample)

        # Use DuckDB in-memory to sniff schema accurately
        safe_path = str(file_path.resolve()).replace("\\", "/")
        con = duckdb.connect(":memory:")
        try:
            # Query duckdb sniff_csv or read_csv
            sniff_query = f"""
            SELECT * FROM read_csv('{safe_path}', 
                delim='{delimiter}', 
                header=true, 
                auto_detect=true,
                sample_size=1000,
                ignore_errors=true
            ) LIMIT 5;
            """
            cursor = con.execute(sniff_query)
            description = cursor.description or []
            sample_data = cursor.fetchall()

            existing_cols: set[str] = set()
            columns_info = []
            
            for idx, col in enumerate(description):
                raw_col_name = str(col[0])
                sanitized_name = cls.sanitize_column_name(raw_col_name, idx, existing_cols)
                data_type = str(col[1]) if len(col) > 1 and col[1] else "VARCHAR"
                
                # Extract sample values for this column
                samples = []
                for row in sample_data:
                    if idx < len(row):
                        val = row[idx]
                        if val is not None:
                            samples.append(str(val))
                
                columns_info.append({
                    "column_name": sanitized_name,
                    "data_type": data_type,
                    "ordinal_position": idx + 1,
                    "is_nullable": True,
                    "sample_values": samples[:3],
                })

            formatted_sample_rows = [list(r) for r in sample_data]
            return delimiter, True, columns_info, formatted_sample_rows

        except Exception as e:
            # Fallback simple python csv reader
            try:
                f_io = io.StringIO(text_sample)
                reader = csv.reader(f_io, delimiter=delimiter)
                headers = next(reader, None)
                if not headers:
                    raise CSVParseError("Could not parse headers from CSV.")
                
                existing_cols: set[str] = set()
                columns_info = []
                for idx, h in enumerate(headers):
                    col_name = cls.sanitize_column_name(h, idx, existing_cols)
                    columns_info.append({
                        "column_name": col_name,
                        "data_type": "VARCHAR",
                        "ordinal_position": idx + 1,
                        "is_nullable": True,
                        "sample_values": [],
                    })
                sample_rows = []
                for _ in range(5):
                    row = next(reader, None)
                    if row:
                        sample_rows.append(row)
                return delimiter, True, columns_info, sample_rows
            except Exception as fallback_err:
                raise CSVParseError(f"Failed to inspect CSV file structure: {str(e)}")
