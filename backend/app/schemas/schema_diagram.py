from pydantic import BaseModel


class ColumnDetail(BaseModel):
    name: str
    type: str
    is_pk_hint: bool = False
    is_fk_hint: bool = False


class TableNode(BaseModel):
    id: str
    table_name: str
    row_count: int
    columns: list[ColumnDetail]


class RelationshipEdge(BaseModel):
    id: str
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    label: str = "references"


class SchemaGraphResponse(BaseModel):
    nodes: list[TableNode]
    edges: list[RelationshipEdge]
