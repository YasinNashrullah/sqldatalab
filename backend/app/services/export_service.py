import csv
import io
import json
from typing import Any


class ExportService:
    """Service to export query results into CSV (with UTF-8 BOM) and JSON."""

    @classmethod
    def export_to_csv(cls, columns: list[str], rows: list[list[Any]]) -> io.BytesIO:
        """Export rows to CSV with UTF-8 BOM for Excel compatibility."""
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        # Write headers
        writer.writerow(columns)
        
        # Write rows
        for row in rows:
            writer.writerow([str(val) if val is not None else "" for val in row])
        
        # Encode with UTF-8 BOM
        csv_bytes = b"\xef\xbb\xbf" + output.getvalue().encode("utf-8")
        return io.BytesIO(csv_bytes)

    @classmethod
    def export_to_json(cls, columns: list[str], rows: list[list[Any]], pretty: bool = True) -> io.BytesIO:
        """Export rows to JSON format (list of objects)."""
        data = []
        for row in rows:
            record = {}
            for idx, col in enumerate(columns):
                val = row[idx] if idx < len(row) else None
                record[col] = val
            data.append(record)

        indent = 2 if pretty else None
        json_str = json.dumps(data, indent=indent, default=str)
        return io.BytesIO(json_str.encode("utf-8"))
