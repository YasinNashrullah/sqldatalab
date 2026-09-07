from typing import Any
from fastapi import APIRouter, Response
from pydantic import BaseModel
from backend.app.services.export_service import ExportService

router = APIRouter(prefix="/exports", tags=["Exports"])


class ExportPayload(BaseModel):
    filename: str = "query_results"
    columns: list[str]
    rows: list[list[Any]]


@router.post("/csv")
async def export_csv(payload: ExportPayload):
    stream = ExportService.export_to_csv(payload.columns, payload.rows)
    filename = f"{payload.filename}.csv"
    return Response(
        content=stream.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/json")
async def export_json(payload: ExportPayload):
    stream = ExportService.export_to_json(payload.columns, payload.rows, pretty=True)
    filename = f"{payload.filename}.json"
    return Response(
        content=stream.getvalue(),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
