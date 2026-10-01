import logging

from fastapi import APIRouter, HTTPException, Response

from documentos import VerticalNoSoportadoError, generar_documento
from documentos.schemas import GenerarDocumentoInput

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documentos", tags=["documentos"])


@router.post("/generar")
def generar(payload: GenerarDocumentoInput) -> Response:
    """Genera un documento a partir del expediente. Stateless: los datos llegan
    en el payload (autenticación y carga desde Supabase las hace Next.js)."""
    try:
        contenido, media_type, filename = generar_documento(payload)
    except VerticalNoSoportadoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:  # noqa: BLE001 — error de render → 500 genérico (detalle solo en logs)
        logger.exception("Error generando documento")
        raise HTTPException(status_code=500, detail="No se pudo generar el documento. Inténtalo de nuevo.")

    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
