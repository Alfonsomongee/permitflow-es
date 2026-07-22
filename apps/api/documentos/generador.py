import io
import re
import zipfile

from .mtd import generar_mtd_docx
from .pdf import generar_checklist_pdf, generar_plan_pdf
from .schemas import GenerarDocumentoInput
from .contextos import VERTICALES_MTD

MEDIA_PDF = "application/pdf"
MEDIA_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MEDIA_ZIP = "application/zip"


class VerticalNoSoportadoError(ValueError):
    pass


def _slug(texto: str, fallback: str = "expediente") -> str:
    limpio = re.sub(r"[^A-Za-z0-9]+", "-", texto or "").strip("-")
    return (limpio[:40] or fallback)


def _base_nombre(payload: GenerarDocumentoInput) -> str:
    exp = payload.expediente
    ref = _slug(exp.referencia_cliente or exp.municipio)
    return f"PermitFlow_{ref}_{exp.id[:8]}"


def generar_documento(payload: GenerarDocumentoInput) -> tuple[bytes, str, str]:
    """Devuelve (contenido, media_type, filename)."""
    base = _base_nombre(payload)

    if payload.tipo == "plan":
        return generar_plan_pdf(payload), MEDIA_PDF, f"{base}_Plan.pdf"

    if payload.tipo == "checklist":
        return generar_checklist_pdf(payload), MEDIA_PDF, f"{base}_Checklist.pdf"

    if payload.tipo == "mtd":
        try:
            contenido = generar_mtd_docx(payload)
        except ValueError as exc:
            raise VerticalNoSoportadoError(str(exc)) from exc
        return contenido, MEDIA_DOCX, f"{base}_MTD_borrador.docx"

    # dossier: plan + checklist (+ MTD si el vertical lo soporta)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{base}_Plan.pdf", generar_plan_pdf(payload))
        zf.writestr(f"{base}_Checklist.pdf", generar_checklist_pdf(payload))
        if payload.expediente.tipo_instalacion in VERTICALES_MTD:
            zf.writestr(f"{base}_MTD_borrador.docx", generar_mtd_docx(payload))
    return buf.getvalue(), MEDIA_ZIP, f"{base}_Dossier.zip"
