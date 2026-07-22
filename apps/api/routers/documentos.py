from fastapi import APIRouter, HTTPException, Response

from documentos import VerticalNoSoportadoError, generar_documento
from documentos.schemas import GenerarDocumentoInput

router = APIRouter(prefix="/api/v1/documentos", tags=["documentos"])


@router.post("/generar")
def generar(payload: GenerarDocumentoInput) -> Response:
    """Genera un documento a partir del expediente. Stateless: los datos llegan
    en el payload (autenticación y carga desde Supabase las hace Next.js)."""
    try:
        contenido, media_type, filename = generar_documento(payload)
    except VerticalNoSoportadoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 — error de render → 500 con detalle
        raise HTTPException(status_code=500, detail=f"Error generando documento: {exc}")

    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
