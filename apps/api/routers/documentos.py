import re

from fastapi import APIRouter, HTTPException, Response

from documentos import VerticalNoSoportadoError, generar_documento
from documentos.pdf import generar_informe_viabilidad_pdf
from documentos.schemas import GenerarDocumentoInput, GenerarInformeViabilidadInput

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


@router.post("/informe-viabilidad")
def informe_viabilidad(payload: GenerarInformeViabilidadInput) -> Response:
    """Informe de viabilidad geográfica (PREM-05): PDF de una página a partir
    del resultado ya calculado de /api/v1/orientacion/idoneidad. No requiere
    expediente ni clasificación."""
    try:
        contenido = generar_informe_viabilidad_pdf(payload)
    except Exception as exc:  # noqa: BLE001 — error de render → 500 con detalle
        raise HTTPException(status_code=500, detail=f"Error generando informe: {exc}")

    slug = re.sub(r"[^A-Za-z0-9]+", "-", payload.municipio or "ubicacion").strip("-")[:40]
    filename = f"PermitFlow_Informe_Viabilidad_{slug or 'ubicacion'}.pdf"
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
