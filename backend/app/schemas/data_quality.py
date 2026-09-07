from typing import Any, Optional
from pydantic import BaseModel


class NumericDistribution(BaseModel):
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    avg_val: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None
    iqr: Optional[float] = None
    outliers_count: int = 0


class ColumnQuality(BaseModel):
    name: str
    data_type: str
    null_count: int
    null_percentage: float
    distinct_count: Optional[int] = None
    distinct_percentage: Optional[float] = None
    is_constant: bool = False
    is_candidate_pk: bool = False
    numeric_distribution: Optional[NumericDistribution] = None


class QualityIssue(BaseModel):
    severity: str  # "CRITICAL", "WARNING", "INFO"
    column: Optional[str] = None
    message: str
    suggested_action: Optional[str] = None


class DataQualityProfileResponse(BaseModel):
    table_name: str
    total_rows: int
    total_columns: int
    duplicate_rows: int
    duplicate_percentage: float
    quality_score: int  # 0 to 100
    quality_grade: str  # A, B, C, D
    columns: list[ColumnQuality]
    issues: list[QualityIssue]
    clean_sql_snippet: Optional[str] = None
