"""Renderizado PDF con fpdf2 (pure-Python: sin dependencias de sistema)."""
import re
from datetime import date

from fpdf import FPDF
from fpdf.fonts import FontFace

from .contextos import (
    datos_instalacion,
    estado_de_tramite,
    etiqueta_comunidad,
    etiqueta_tipo,
    resumen_progreso,
)
from .schemas import GenerarDocumentoInput

BRAND = (15, 76, 58)        # verde corporativo sobrio
GRIS = (110, 110, 110)
GRIS_CLARO = (243, 244, 246)

# Fuentes core = latin-1. Tildes y ñ entran; estos caracteres habituales no.
_REEMPLAZOS = {
    "€": "EUR", "–": "-", "—": "-", "\u2018": "'", "\u2019": "'",
    "\u201c": '"', "\u201d": '"', "…": "...", "•": "-", "☐": "[ ]", "→": "->",
}


def _s(texto) -> str:
    """Sanitiza a latin-1 para fuentes core de fpdf2."""
    if texto is None:
        return ""
    out = str(texto)
    for k, v in _REEMPLAZOS.items():
        out = out.replace(k, v)
    return out.encode("latin-1", "replace").decode("latin-1")


class PermitFlowPDF(FPDF):
    """A4 con cabecera de organización (white-label) y pie paginado."""

    def __init__(self, org_nombre: str, titulo_doc: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.org_nombre = _s(org_nombre)
        self.titulo_doc = _s(titulo_doc)
        self.alias_nb_pages()
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font("helvetica", "B", 13)
        self.set_text_color(*BRAND)
        self.cell(0, 7, self.org_nombre, new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "", 9)
        self.set_text_color(*GRIS)
        self.cell(0, 5, self.titulo_doc, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BRAND)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(5)

    def footer(self):
        self.set_y(-14)
        self.set_font("helvetica", "I", 7)
        self.set_text_color(*GRIS)
        self.cell(
            0, 5,
            _s(f"Generado con PermitFlow ES el {date.today().strftime('%d/%m/%Y')} - "
               "Documento informativo: no sustituye la revision de un tecnico competente."),
            new_x="LMARGIN", new_y="NEXT",
        )
        self.cell(0, 4, f"Página {self.page_no()}/{{nb}}", align="C")


# ── Presupuesto ───────────────────────────────────────────────────────────────

def _importes_de_coste(texto: str | None) -> list[float]:
    """Extrae importes en euros de un coste_estimado en texto libre.

    Los JSONs de normativa escriben el coste en prosa ("Sin tasa (0 EUR)",
    "aprox. 120 €", "35,50 euros"). Sumamos lo que se puede parsear y el
    resto se refleja como 'a consultar', nunca como cero silencioso.
    """
    if not texto:
        return []
    importes: list[float] = []
    for bruto in re.findall(r"(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR|euros?)", texto, flags=re.IGNORECASE):
        limpio = bruto.replace(" ", "").replace(".", "").replace(",", ".")
        try:
            importes.append(float(limpio))
        except ValueError:
            continue
    return importes


def generar_presupuesto_pdf(payload: GenerarDocumentoInput) -> bytes:
    """Resumen de una página para adjuntar a una oferta comercial.

    A diferencia del plan, se dirige al cliente final de la instaladora: no
    detalla documentación ni bases legales, sino alcance, coste y plazo.
    """
    exp, plan = payload.expediente, payload.plan
    org = payload.organizacion
    pdf = PermitFlowPDF(org.nombre, "Presupuesto de tramitación administrativa")
    pdf.add_page()

    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 9, _s(etiqueta_tipo(exp.tipo_instalacion)), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(*GRIS)
    pdf.cell(
        0, 6,
        _s(f"{exp.municipio} ({etiqueta_comunidad(exp.comunidad)}) - {exp.potencia_kw:g} kW"),
        new_x="LMARGIN", new_y="NEXT",
    )
    pdf.ln(3)
    pdf.set_text_color(0, 0, 0)

    pdf.bloque_datos(datos_instalacion(exp))

    # ── Alcance: qué trámites cubre la gestión ──
    pdf.subtitulo("Alcance de la tramitación")
    pdf.set_font("helvetica", "", 8.5)
    cabecera = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=BRAND)
    total_conocido = 0.0
    hay_desconocidos = False

    with pdf.table(
        col_widths=(9, 96, 45, 30),
        text_align=("CENTER", "LEFT", "LEFT", "RIGHT"),
        headings_style=cabecera,
        line_height=4.8,
    ) as tabla:
        cab = tabla.row()
        for h in ("Nº", "Trámite", "Organismo", "Tasas"):
            cab.cell(h)
        for t in plan.tramites:
            importes = _importes_de_coste(t.coste_estimado)
            if importes:
                subtotal = sum(importes)
                total_conocido += subtotal
                texto_coste = f"{subtotal:,.2f} EUR".replace(",", "@").replace(".", ",").replace("@", ".")
            elif t.coste_estimado:
                hay_desconocidos = True
                texto_coste = "a consultar"
            else:
                texto_coste = "-"
            fila = tabla.row()
            fila.cell(str(t.orden))
            fila.cell(_s(t.nombre))
            fila.cell(_s(t.organismo))
            fila.cell(_s(texto_coste))
    pdf.ln(3)

    # ── Resumen económico y de plazos ──
    pdf.subtitulo("Resumen")
    total_fmt = f"{total_conocido:,.2f} EUR".replace(",", "@").replace(".", ",").replace("@", ".")
    filas_resumen = [
        ("Trámites incluidos", str(len(plan.tramites))),
        ("Tasas administrativas identificadas", total_fmt),
    ]
    if plan.tiempo_total_estimado_dias:
        filas_resumen.append(
            ("Plazo estimado de tramitación", f"{plan.tiempo_total_estimado_dias} días")
        )
    pdf.bloque_datos(filas_resumen)

    # ── Advertencias honestas ──
    pdf.set_font("helvetica", "I", 7.5)
    pdf.set_text_color(*GRIS)
    avisos = [
        "Las tasas indicadas son las identificadas en la normativa aplicable y no incluyen "
        "honorarios técnicos, materiales ni ejecución de la instalación.",
    ]
    if hay_desconocidos:
        avisos.append(
            "Algunos trámites tienen tasas variables segun municipio u organismo: se han "
            "marcado como 'a consultar' y no se suman al total."
        )
    if getattr(plan, "nivel_verificacion", "verificada") == "generica":
        avisos.append(
            "Plan basado en normativa estatal; las particularidades autonomicas de esta "
            "comunidad estan pendientes de verificacion."
        )
    avisos.append(
        "Los plazos son orientativos y dependen de la carga de trabajo de cada organismo."
    )
    for aviso in avisos:
        pdf.multi_cell(0, 4, _s(f"- {aviso}"), new_x="LMARGIN", new_y="NEXT")

    # ── Marca PermitFlow (plan gratuito) ──
    if org.marca_permitflow:
        pdf.ln(4)
        pdf.set_font("helvetica", "B", 8)
        pdf.set_text_color(*BRAND)
        pdf.cell(
            0, 5,
            _s("Presupuesto generado automaticamente con PermitFlow ES - permitflow.es"),
            new_x="LMARGIN", new_y="NEXT", align="C",
        )
    pdf.set_text_color(0, 0, 0)

    return bytes(pdf.output())

    # ── Bloques reutilizables ────────────────────────────────────────────
    def bloque_datos(self, filas: list[tuple[str, str]]):
        self.set_font("helvetica", "", 9)
        self.set_text_color(0, 0, 0)
        estilo_cab = FontFace(emphasis="BOLD", fill_color=GRIS_CLARO)
        with self.table(
            col_widths=(58, 122),
            first_row_as_headings=False,
            line_height=6,
            borders_layout="HORIZONTAL_LINES",
        ) as tabla:
            for etiqueta, valor in filas:
                fila = tabla.row()
                fila.cell(_s(etiqueta), style=estilo_cab)
                fila.cell(_s(valor))
        self.ln(4)

    def subtitulo(self, texto: str):
        self.set_font("helvetica", "B", 11)
        self.set_text_color(*BRAND)
        self.cell(0, 7, _s(texto), new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
        self.set_text_color(0, 0, 0)


def generar_plan_pdf(payload: GenerarDocumentoInput) -> bytes:
    exp, plan = payload.expediente, payload.plan
    pdf = PermitFlowPDF(payload.organizacion.nombre, "Plan de Tramitación")
    pdf.add_page()

    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 9, _s(etiqueta_tipo(exp.tipo_instalacion)), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.bloque_datos(datos_instalacion(exp))

    completados, total = resumen_progreso(payload)
    pdf.set_font("helvetica", "", 9)
    resumen = f"{total} trámites"
    if plan.tiempo_total_estimado_dias:
        resumen += f" - tiempo estimado en serie: {plan.tiempo_total_estimado_dias} días"
    if completados:
        resumen += f" - completados: {completados}/{total}"
    pdf.cell(0, 6, _s(resumen), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.subtitulo("Secuencia de trámites")
    cabecera = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=BRAND)
    pdf.set_font("helvetica", "", 8)
    with pdf.table(
        col_widths=(9, 74, 42, 22, 16, 17),
        text_align=("CENTER", "LEFT", "LEFT", "CENTER", "CENTER", "CENTER"),
        headings_style=cabecera,
        line_height=4.5,
    ) as tabla:
        cab = tabla.row()
        for h in ("Nº", "Trámite", "Organismo", "Plataforma", "Est. (d)", "Legal (d)"):
            cab.cell(h)
        for t in plan.tramites:
            fila = tabla.row()
            fila.cell(str(t.orden))
            nombre = t.nombre + (f"  [Ref. {t.formulario_ref}]" if t.formulario_ref else "")
            fila.cell(_s(nombre))
            fila.cell(_s(t.organismo))
            fila.cell(_s(t.plataforma or "-"))
            fila.cell(str(t.plazo_estimado_dias) if t.plazo_estimado_dias else "-")
            fila.cell(str(t.plazo_legal_dias) if t.plazo_legal_dias else "-")
    pdf.ln(4)

    if plan.advertencias:
        pdf.subtitulo("Advertencias")
        pdf.set_font("helvetica", "", 8.5)
        for adv in plan.advertencias:
            pdf.multi_cell(0, 5, _s(f"- {adv}"), new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


def generar_checklist_pdf(payload: GenerarDocumentoInput) -> bytes:
    exp, plan = payload.expediente, payload.plan
    pdf = PermitFlowPDF(payload.organizacion.nombre, "Checklist de documentación por trámite")
    pdf.add_page()

    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 8, _s(f"Checklist - {etiqueta_tipo(exp.tipo_instalacion)}"),
             new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.bloque_datos(datos_instalacion(exp))

    for t in plan.tramites:
        # Evitar que un trámite empiece pegado al final de página
        if pdf.get_y() > pdf.h - 55:
            pdf.add_page()

        pdf.set_fill_color(*GRIS_CLARO)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 7, _s(f"{t.orden}. {t.nombre}"), new_x="LMARGIN", new_y="NEXT", fill=True)

        pdf.set_font("helvetica", "", 8)
        pdf.set_text_color(*GRIS)
        meta = [t.organismo]
        if t.plataforma:
            meta.append(f"Plataforma: {t.plataforma}")
        if t.formulario_ref:
            meta.append(f"Ref. procedimiento: {t.formulario_ref}")
        if t.plazo_legal_dias:
            meta.append(f"Plazo legal: {t.plazo_legal_dias} días")
        info = estado_de_tramite(payload, t.orden)
        if info and info.estado == "completado" and info.fecha_completado:
            meta.append(f"COMPLETADO el {info.fecha_completado}")
        elif info and info.estado == "en_curso" and info.fecha_inicio:
            meta.append(f"En curso desde {info.fecha_inicio}")
        pdf.multi_cell(0, 4.5, _s("  |  ".join(meta)), new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.ln(1)

        pdf.set_font("helvetica", "", 9)
        if not t.documentos_requeridos:
            pdf.cell(0, 5.5, _s("[ ]  Sin documentos específicos registrados para este trámite"),
                     new_x="LMARGIN", new_y="NEXT")
        for doc in t.documentos_requeridos:
            sufijo = "" if doc.obligatorio else "  (opcional)"
            pdf.multi_cell(0, 5.5, _s(f"[ ]  {doc.label}{sufijo}"),
                           new_x="LMARGIN", new_y="NEXT")
            if doc.descripcion:
                pdf.set_font("helvetica", "I", 7.5)
                pdf.set_text_color(*GRIS)
                pdf.set_x(pdf.l_margin + 7)
                pdf.multi_cell(0, 4, _s(doc.descripcion), new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("helvetica", "", 9)
                pdf.set_text_color(0, 0, 0)
        pdf.ln(3)

    return bytes(pdf.output())
