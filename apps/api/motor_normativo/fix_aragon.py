import json
import pathlib

def main():
    f = pathlib.Path("apps/api/motor_normativo/reglas/aragon/fotovoltaica_autoconsumo.json")
    with open(f, "r", encoding="utf-8") as file:
        data = json.load(file)

    # We will completely rewrite the rules array for Aragon
    radne_base_tramite_0 = {
        "orden": 1,
        "nombre": "Declaración responsable + registro RADNE (Alta)",
        "organismo": "D.G. competente en energía, Gobierno de Aragón",
        "base_legal": "Ley 1/2021 art. 59.2; RD 244/2019 art. 8",
        "plazo_estimado_dias": 30,
        "plazo_legal_dias": None,
        "plataforma": "Tramitador del Gobierno de Aragón (trámite 2459)",
        "plataforma_url": "https://www.aragon.es/tramitador/-/tramite/registro-administrativo-autoconsumo-energia-electrica",
        "coste_estimado": "0 EUR (exenta)",
        "formulario_ref": "F107",
        "documentos_requeridos": [
            {"id": "dr", "label": "Declaración responsable", "descripcion": "Conforme reglamentación técnica aplicable", "obligatorio": True},
            {"id": "memoria_cie", "label": "Memoria técnica y CIE", "descripcion": "Instalador habilitado BT", "obligatorio": True},
            {"id": "f107", "label": "Formulario F107", "descripcion": "Inscripción en RADNE", "obligatorio": True}
        ],
        "notas": "Si P < 100 kW en BT, derivar a portal PEGASSO. Solo enviar a SEDA instalaciones que superen umbrales.",
        "paralelo_con": None
    }

    radne_base_tramite_100 = {
        "orden": 1,
        "nombre": "Declaración responsable + registro RADNE (Alta)",
        "organismo": "D.G. competente en energía, Gobierno de Aragón",
        "base_legal": "Ley 1/2021 art. 59.2; RD 244/2019 art. 8",
        "plazo_estimado_dias": 30,
        "plazo_legal_dias": None,
        "plataforma": "Tramitador del Gobierno de Aragón (trámite 2459)",
        "plataforma_url": "https://www.aragon.es/tramitador/-/tramite/registro-administrativo-autoconsumo-energia-electrica",
        "coste_estimado": "56.20 EUR (Tasa 14, ap. 5, tarifa 52, regla 4ª)",
        "formulario_ref": "F106",
        "documentos_requeridos": [
            {"id": "dr", "label": "Declaración responsable", "descripcion": "Conforme reglamentación técnica aplicable", "obligatorio": True},
            {"id": "memoria_cie", "label": "Memoria técnica y CIE", "descripcion": "Instalador habilitado", "obligatorio": True},
            {"id": "f106", "label": "Formulario F106", "descripcion": "Inscripción en RADNE", "obligatorio": True}
        ],
        "notas": "Solo enviar a SEDA instalaciones que superen umbrales.",
        "paralelo_con": None
    }
    
    autorizacion_tramite = {
        "orden": 2,
        "nombre": "Autorización administrativa previa y de construcción (trámite 783)",
        "organismo": "D.G. competente en energía (o Servicio Provincial si FV <=1 MW)",
        "base_legal": "Ley 24/2013 art. 53.1; RD 1955/2000",
        "plazo_estimado_dias": 90,
        "plazo_legal_dias": 90,
        "plataforma": "Tramitador del Gobierno de Aragón (trámite 783)",
        "plataforma_url": "https://www.aragon.es/-/energia-fotovoltaica-en-aragon",
        "coste_estimado": "Tasa 14.1 (importe dependiente de la inversión del proyecto)",
        "formulario_ref": "F102",
        "documentos_requeridos": [
            {"id": "proyecto", "label": "Proyecto y anexo de configuración de potencia", "descripcion": "Técnico competente", "obligatorio": True},
            {"id": "cap_econ", "label": "Acreditación de capacidad económica y técnica", "descripcion": "", "obligatorio": True},
            {"id": "acceso", "label": "Permisos de acceso y conexión", "descripcion": "Distribuidora/transportista", "obligatorio": True},
            {"id": "dia", "label": "Declaración de Impacto Ambiental (DIA)", "descripcion": "Si procede", "obligatorio": True},
            {"id": "caja_deposito", "label": "Acreditación depósito en Caja Depósitos", "descripcion": "Resguardo garantía económica", "obligatorio": True}
        ],
        "notas": "Plazo legal: autorización previa 3 meses y de construcción 3 meses; explotación 1 mes. Silencio desestimatorio por analogía sectorial. Competencia del Servicio Provincial para FV <=1 MW. Requiere clasificar si en terreno rústico o urbano.",
        "paralelo_con": None
    }
    
    aval_tramite = {
        "orden": 1,
        "nombre": "Aval de acceso/conexión",
        "organismo": "Distribuidora",
        "base_legal": "Instrucción 2/2021; RD 244/2019; art. 53.3 Ley 24/2013",
        "plazo_estimado_dias": 15,
        "plazo_legal_dias": None,
        "plataforma": "Distribuidora",
        "plataforma_url": None,
        "coste_estimado": "25.00 EUR (gestión resguardo garantía tarifa 58)",
        "formulario_ref": None,
        "documentos_requeridos": [
            {"id": "cau", "label": "CAU", "descripcion": "De la distribuidora", "obligatorio": True},
            {"id": "aval", "label": "Aval económico", "descripcion": "Resguardo del depósito", "obligatorio": True}
        ],
        "notas": "Aval de 40 EUR/kW requerido para instalaciones con excedentes >15 kW urbano / >10 kW rural.",
        "paralelo_con": None
    }

    reglas = [
        {
            "id": "ARA-FV-BASE-100",
            "descripcion": "Base: Autoconsumo <100 kW",
            "condicion": {"<": [{"var": "potencia_kw"}, 100]},
            "tramites": [radne_base_tramite_0]
        },
        {
            "id": "ARA-FV-BASE-MAYOR100",
            "descripcion": "Base: Autoconsumo >=100 kW",
            "condicion": {">=": [{"var": "potencia_kw"}, 100]},
            "tramites": [radne_base_tramite_100, autorizacion_tramite]
        },
        {
            "id": "ARA-FV-CON-EXCEDENTES",
            "descripcion": "Refinamiento: Con excedentes",
            "condicion": {"==": [{"var": "modalidad_autoconsumo"}, "con_excedentes"]},
            "tramites": [aval_tramite]
        },
        {
            "id": "ARA-FV-AT",
            "descripcion": "Refinamiento: Alta Tensión (para <100 kW)",
            "condicion": {"and": [{"==": [{"var": "tension"}, "AT"]}, {"<": [{"var": "potencia_kw"}, 100]}]},
            "tramites": [autorizacion_tramite]
        }
    ]

    data["reglas"] = reglas

    if "validaciones" not in data:
        data["validaciones"] = []
    # Find and update or add
    has_mod = False
    for v in data["validaciones"]:
        if "modalidad_autoconsumo" in v.get("campos_requeridos", []):
            has_mod = True
    if not has_mod:
        data["validaciones"].append({
            "severidad": "aviso",
            "campos_requeridos": ["modalidad_autoconsumo"],
            "mensaje": "Si no se especifica la modalidad de autoconsumo, el plan asume 'sin excedentes'."
        })

    with open(f, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

if __name__ == "__main__":
    main()
