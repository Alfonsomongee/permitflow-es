"""Construcción de contextos para los documentos: lógica pura, sin I/O."""
from .schemas import ExpedienteDoc, GenerarDocumentoInput

TIPO_LABEL = {
    "fotovoltaica_autoconsumo": "Fotovoltaica de autoconsumo",
    "climatizacion_aerotermia": "Climatización y aerotermia",
    "acs": "Agua caliente sanitaria (ACS)",
    "gas_baja_presion": "Gas baja presión",
    "irve": "Recarga de vehículo eléctrico (IRVE)",
}

VERTICALES_MTD = {"fotovoltaica_autoconsumo", "irve"}

MODO_RECARGA_LABEL = {
    "1": "Modo 1", "2": "Modo 2", "3": "Modo 3", "4": "Modo 4",
}


def etiqueta_tipo(slug: str) -> str:
    return TIPO_LABEL.get(slug, slug.replace("_", " ").capitalize())


def etiqueta_comunidad(slug: str) -> str:
    especiales = {
        "castilla_la_mancha": "Castilla-La Mancha",
        "castilla_leon": "Castilla y León",
        "comunidad_valenciana": "Comunidad Valenciana",
        "la_rioja": "La Rioja",
        "pais_vasco": "País Vasco",
        "andalucia": "Andalucía",
        "aragon": "Aragón",
        "cataluna": "Cataluña",
    }
    return especiales.get(slug, slug.replace("_", " ").capitalize())


def datos_instalacion(exp: ExpedienteDoc) -> list[tuple[str, str]]:
    """Pares (etiqueta, valor) para las tablas de cabecera de todos los docs."""
    filas: list[tuple[str, str]] = [
        ("Tipo de instalación", etiqueta_tipo(exp.tipo_instalacion)),
        ("Ubicación", f"{exp.municipio} ({etiqueta_comunidad(exp.comunidad)})"),
        ("Potencia", f"{exp.potencia_kw:g} kW"),
    ]
    if exp.uso:
        filas.append(("Uso", exp.uso.replace("_", " ").capitalize()))
    if exp.tipo_instalacion == "irve":
        if exp.numero_puntos:
            filas.append(("Nº de puntos de recarga", str(exp.numero_puntos)))
        if exp.modo_recarga:
            filas.append(("Modo de recarga (ITC-BT-52)",
                          MODO_RECARGA_LABEL.get(exp.modo_recarga, exp.modo_recarga)))
        if exp.acceso_publico is not None:
            filas.append(("Acceso público", "Sí" if exp.acceso_publico else "No"))
        if exp.ubicacion_irve:
            filas.append(("Ubicación del punto", exp.ubicacion_irve.replace("_", " ").capitalize()))
        if exp.requiere_nuevo_suministro is not None:
            filas.append(("Nuevo suministro / aumento de potencia",
                          "Sí" if exp.requiere_nuevo_suministro else "No"))
    if exp.tipo_instalacion == "gas_baja_presion":
        if exp.combustible:
            filas.append(("Combustible", exp.combustible.replace("_", " ").capitalize()))
        if exp.presion_bar:
            filas.append(("Presión de red", f"{exp.presion_bar} bar"))
    if exp.solicita_ayuda:
        filas.append(("Solicita subvención", "Sí"))
    if exp.referencia_cliente:
        filas.insert(0, ("Referencia de cliente", exp.referencia_cliente))
    return filas


def bases_legales_unicas(payload: GenerarDocumentoInput) -> list[str]:
    """Normativa de aplicación deduplicada, en orden de aparición en el plan."""
    vistas: list[str] = []
    for t in payload.plan.tramites:
        base = (t.base_legal or "").strip()
        if base and base.lower() not in {"normativa", "normativa municipal"} and base not in vistas:
            vistas.append(base)
    return vistas


def resumen_progreso(payload: GenerarDocumentoInput) -> tuple[int, int]:
    """(completados, total) según tramites_estado del Bloque 1."""
    total = len(payload.plan.tramites)
    completados = sum(
        1 for info in payload.tramites_estado.values() if info.estado == "completado"
    )
    return completados, total


def estado_de_tramite(payload: GenerarDocumentoInput, orden: int):
    return payload.tramites_estado.get(str(orden))
