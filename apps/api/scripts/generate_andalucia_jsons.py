import json
from pathlib import Path
import copy

BASE_DIR = Path("c:/Users/aphmo/Proyectos/permitflow-es/apps/api/motor_normativo/reglas/andalucia")
BASE_DIR.mkdir(parents=True, exist_ok=True)

# 1. Update Fotovoltaica
with open(BASE_DIR / "fotovoltaica_autoconsumo.json", "r", encoding="utf-8") as f:
    fv = json.load(f)

fv["version"] = "1.1.0"
fv["ultima_revision"] = "2026-06-17"
fv["revisado_por"] = "investigacion-deep-research-verificada"

fv["fuentes"] = [
    "RD 244/2019, de 5 de abril — autoconsumo eléctrico",
    "RD 1183/2020, de 29 de diciembre — acceso y conexión a red",
    "Decreto 59/2005, de 1 de marzo + Orden de 5 de marzo de 2013",
    "Resolución de 26 de mayo de 2021, DGRN Andalucía"
]

for regla in fv["reglas"]:
    # Actualizar condicion en AND-FV-002
    if regla["id"] == "AND-FV-002":
        # Eliminar el tramite de autorizacion administrativa previa
        regla["tramites"] = [t for t in regla["tramites"] if "Autorización administrativa previa" not in t["nombre"]]
        # Reordenar
        for idx, t in enumerate(regla["tramites"], 1):
            t["orden"] = idx

    # Actualizar base_legal y plataforma en todos
    for t in regla["tramites"]:
        if t["base_legal"] and "Decreto 141/2012" in t["base_legal"]:
            t["base_legal"] = t["base_legal"].replace("Decreto 141/2012", "Decreto 59/2005, de 1 de marzo + Orden de 5 de marzo de 2013").replace(" Andalucía", "")
            if "Art. 4" in t["base_legal"] or "Art. 5" in t["base_legal"] or "Art. 8" in t["base_legal"]:
                t["base_legal"] = "Decreto 59/2005, de 1 de marzo + Orden de 5 de marzo de 2013"

        if "RAC" in t["nombre"] or "MITECO" in t["organismo"]:
            t["plataforma"] = "MITECO sede electrónica"
        elif "Junta de Andalucía" in t["organismo"] or "Industria" in t["organismo"]:
            t["plataforma"] = "PUES"
        else:
            t["plataforma"] = None

# Añadir AND-FV-004
fv["reglas"].append({
    "id": "AND-FV-004",
    "descripcion": "Autoconsumo, potencia > 500kW",
    "condicion": {">": [{"var": "potencia_kw"}, 500]},
    "tramites": [
        {
            "orden": 1,
            "nombre": "Autorización Administrativa Previa",
            "organismo": "Junta de Andalucía",
            "base_legal": "Ley 24/2013 del Sector Eléctrico",
            "plazo_estimado_dias": 180,
            "plazo_legal_dias": None,
            "documentos_requeridos": ["proyecto_tecnico_visado", "estudio_impacto_ambiental"],
            "formulario_ref": "9588",
            "paralelo_con": None,
            "notas": "Código 9588 Junta Andalucía",
            "plataforma": "PUES",
            "obsoleta": False,
            "obsoleta_desde": None
        },
        {
            "orden": 2,
            "nombre": "Autorización Administrativa de Construcción",
            "organismo": "Junta de Andalucía",
            "base_legal": "Ley 24/2013 del Sector Eléctrico",
            "plazo_estimado_dias": 90,
            "plazo_legal_dias": None,
            "documentos_requeridos": ["proyecto_ejecucion"],
            "formulario_ref": "11944",
            "paralelo_con": None,
            "notas": "Código 11944 Junta Andalucía",
            "plataforma": "PUES",
            "obsoleta": False,
            "obsoleta_desde": None
        },
        {
            "orden": 3,
            "nombre": "PUES / Autorización de Explotación",
            "organismo": "Junta de Andalucía",
            "base_legal": "Ley 24/2013 del Sector Eléctrico",
            "plazo_estimado_dias": 30,
            "plazo_legal_dias": None,
            "documentos_requeridos": ["certificado_final_obra"],
            "formulario_ref": "11954",
            "paralelo_con": None,
            "notas": "Código 11954 Junta Andalucía",
            "plataforma": "PUES",
            "obsoleta": False,
            "obsoleta_desde": None
        }
    ]
})

with open(BASE_DIR / "fotovoltaica_autoconsumo.json", "w", encoding="utf-8") as f:
    json.dump(fv, f, ensure_ascii=False, indent=2)


# 2. Climatizacion
clim = {
    "tipo_instalacion": "climatizacion_aerotermia",
    "comunidad": "andalucia",
    "version": "1.0.0",
    "ultima_revision": "2026-06-17",
    "revisado_por": "investigacion-deep-research-verificada",
    "fuentes": [
        "RD 1027/2007 RITE",
        "RD 552/2019 RSIF",
        "RD 115/2017 gases fluorados",
        "Reglamento UE 2024/573",
        "Decreto 59/2005 Junta Andalucía",
        "Orden 5 de marzo de 2013 Junta Andalucía"
    ],
    "reglas": [
        {
            "id": "AND-CLIM-001",
            "descripcion": "Potencia < 5kW",
            "condicion": {"<": [{"var": "potencia_kw"}, 5]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia/DR municipal si hay obra exterior", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Obligaciones gases fluorados", "organismo": "Empresa mantenedora certificada", "base_legal": "RD 115/2017 gases fluorados", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-CLIM-002",
            "descripcion": "Potencia >= 5kW y <= 70kW",
            "condicion": {"and": [{">=": [{"var": "potencia_kw"}, 5]}, {"<=": [{"var": "potencia_kw"}, 70]}]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia/DR municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Memoria técnica RITE", "organismo": "Técnico/instalador habilitado", "base_legal": "RD 1027/2007 Art. 15.1.b y Art. 17", "plazo_estimado_dias": 3, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Ejecución por empresa habilitada RITE/frigorista", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Certificado de instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007 Arts. 22-24", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Documentación RSIF Nivel 1 si aplica", "organismo": "Empresa habilitada", "base_legal": "RD 552/2019 Art. 21", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Comunicación PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005 + Orden 5 marzo 2013", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-CLIM-003",
            "descripcion": "Potencia > 70kW",
            "condicion": {">": [{"var": "potencia_kw"}, 70]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia/DR municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Proyecto técnico RITE", "organismo": "Técnico competente", "base_legal": "RD 1027/2007 Art. 15.1.a y Art. 16", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "RSIF Nivel 1 o 2 según compresores", "organismo": "Técnico competente", "base_legal": "RD 552/2019", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Ejecución + Dirección técnica", "organismo": "Director de obra", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Certificado instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Inspección OCA si procede", "organismo": "OCA", "base_legal": "RD 552/2019 IF-14", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 7, "nombre": "Comunicación PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005 + Orden 5 marzo 2013", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 8, "nombre": "Contrato mantenimiento", "organismo": "Empresa mantenedora", "base_legal": "RD 1027/2007 Arts. 25-26", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        }
    ]
}

with open(BASE_DIR / "climatizacion_aerotermia.json", "w", encoding="utf-8") as f:
    json.dump(clim, f, ensure_ascii=False, indent=2)


# 3. ACS
acs = {
    "tipo_instalacion": "acs",
    "comunidad": "andalucia",
    "version": "1.0.0",
    "ultima_revision": "2026-06-17",
    "revisado_por": "investigacion-deep-research-verificada",
    "fuentes": [
        "RD 1027/2007 RITE",
        "RD 450/2022 CTE DB-HE4",
        "RD 919/2006 ITC-ICG 07",
        "RD 487/2022 Legionella",
        "RD 614/2024",
        "Decreto 59/2005 Junta Andalucía",
        "Orden 5 marzo 2013"
    ],
    "reglas": [
        {
            "id": "AND-ACS-001",
            "descripcion": "Potencia < 5kW",
            "condicion": {"<": [{"var": "potencia_kw"}, 5]},
            "tramites": [
                {"orden": 1, "nombre": "DR municipal si hay obra exterior", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Justificación CTE DB-HE4 si edificio nuevo/reforma", "organismo": "Ayuntamiento", "base_legal": "RD 450/2022 CTE DB-HE4", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-ACS-002",
            "descripcion": "Potencia >= 5kW y <= 70kW, no industrial",
            "condicion": {"and": [{">=": [{"var": "potencia_kw"}, 5]}, {"<=": [{"var": "potencia_kw"}, 70]}, {"!=": [{"var": "uso"}, "industrial"]}]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Justificación HE4 si aplica", "organismo": "Técnico", "base_legal": "RD 450/2022", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Memoria técnica RITE", "organismo": "Técnico/instalador habilitado", "base_legal": "RD 1027/2007 Art.15.1.b", "plazo_estimado_dias": 3, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Ejecución empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Certificado instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 7, "nombre": "Entrega documentación + mantenimiento", "organismo": "Titular", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-ACS-003",
            "descripcion": "Potencia > 70kW",
            "condicion": {">": [{"var": "potencia_kw"}, 70]},
            "tramites": [
                {"orden": 1, "nombre": "Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Justificación HE4", "organismo": "Técnico", "base_legal": "RD 450/2022", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Proyecto técnico RITE", "organismo": "Técnico competente", "base_legal": "RD 1027/2007 Art.15.1.a", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Dirección técnica", "organismo": "Director de obra", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Ejecución empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Certificado instalación térmica", "organismo": "Empresa habilitada", "base_legal": "RD 1027/2007", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 7, "nombre": "Inspección OCA si procede", "organismo": "OCA", "base_legal": "Normativa", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 8, "nombre": "PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 9, "nombre": "Contrato mantenimiento obligatorio", "organismo": "Empresa mantenedora", "base_legal": "RD 1027/2007 Arts.25-26", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 10, "nombre": "Plan Prevención Legionella si ACS centralizada colectiva", "organismo": "Titular/autoridad sanitaria", "base_legal": "RD 487/2022 modificado RD 614/2024", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Obligatorio en ACS con acumulación/retorno en edificios colectivos o terciarios", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-ACS-GAS",
            "descripcion": "Capa de gas sobre RITE",
            "condicion": {"and": [{">=": [{"var": "potencia_kw"}, 5]}, {"==": [{"var": "combustible"}, "gas"]}]},
            "tramites": [
                {"orden": 1, "nombre": "Certificado IRG-3 instalación individual", "organismo": "Distribuidora/suministradora", "base_legal": "RD 919/2006 ITC-ICG 07 Anexo", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Solo si hay caldera o calentador de gas. Distinto del certificado RITE.", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Puesta en servicio con distribuidora", "organismo": "Distribuidora", "base_legal": "RD 919/2006 ITC-ICG 07 Art.3.5.1", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        }
    ]
}

with open(BASE_DIR / "acs.json", "w", encoding="utf-8") as f:
    json.dump(acs, f, ensure_ascii=False, indent=2)


# 4. Gas Baja Presion
gas = {
    "tipo_instalacion": "gas_baja_presion",
    "comunidad": "andalucia",
    "version": "1.0.0",
    "ultima_revision": "2026-06-17",
    "revisado_por": "investigacion-deep-research-verificada",
    "fuentes": [
        "RD 919/2006 ITC-ICG 07",
        "RD 919/2006 ITC-ICG 03",
        "RD 919/2006 ITC-ICG 06",
        "RD 919/2006 ITC-ICG 09",
        "RD 1434/2002",
        "Decreto 94/2018 Junta Andalucía",
        "Decreto 59/2005 Junta Andalucía",
        "Decreto 441/2004 Andalucía derechos alta gas"
    ],
    "reglas": [
        {
            "id": "AND-GAS-001",
            "descripcion": "IRI doméstica gas natural simple",
            "condicion": {"and": [{"==": [{"var": "combustible"}, "gas_natural"]}, {"<=": [{"var": "potencia_kw"}, 70]}, {"==": [{"var": "uso"}, "residencial"]}]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal si hay obra", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Solicitud acometida si no existe", "organismo": "Nedgia/distribuidora zona", "base_legal": "RD 1434/2002 Art.25", "plazo_estimado_dias": 21, "plazo_legal_dias": 6, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Ejecución por empresa instaladora habilitada categoría A/B/C", "organismo": "Empresa instaladora", "base_legal": "RD 919/2006 ITC-ICG 09", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Certificado IRG-3 instalación individual", "organismo": "Distribuidora/archivo titular", "base_legal": "RD 919/2006 ITC-ICG 07 Anexo", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Contrato suministro + puesta en servicio distribuidora", "organismo": "Distribuidora", "base_legal": "RD 1434/2002 Arts.31-33", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "NO requiere PUES para instalaciones simples sin proyecto. La ITC-ICG 07 no exige comunicación administrativa para IRI doméstica < 70kW", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-GAS-002",
            "descripcion": "Instalación con proyecto obligatorio",
            "condicion": {"or": [{">": [{"var": "potencia_kw"}, 70]}, {"==": [{"var": "presion_bar"}, "5+"]}, {"==": [{"var": "uso"}, "industrial"]}]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 30, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Proyecto técnico instalación receptora", "organismo": "Técnico competente", "base_legal": "RD 919/2006 ITC-ICG 07 Apdo.3.2 y 3.3", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Obligatorio si >70kW individual, >2000kW común, presión >5 bar o técnicas especiales", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Ejecución empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 919/2006", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Certificados IRG correspondientes", "organismo": "Empresa habilitada", "base_legal": "RD 919/2006", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Comunicación PUES", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "Decreto 59/2005 + Orden 5 marzo 2013", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Solo en instalaciones que requieren proyecto", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Contrato suministro + puesta en servicio", "organismo": "Distribuidora/Comercializadora", "base_legal": "RD 1434/2002", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-GAS-003",
            "descripcion": "Depósito fijo GLP",
            "condicion": {"==": [{"var": "combustible"}, "glp_deposito"]},
            "tramites": [
                {"orden": 1, "nombre": "DR/Licencia municipal", "organismo": "Ayuntamiento", "base_legal": "Normativa municipal", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "casi siempre por obra civil", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Memoria técnica o proyecto", "organismo": "Técnico competente", "base_legal": "RD 919/2006 ITC-ICG 03", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Proyecto obligatorio si capacidad >13m3 o alimenta distribución canalizada", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 3, "nombre": "Inspección inicial", "organismo": "OCA", "base_legal": "RD 919/2006", "plazo_estimado_dias": 15, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 4, "nombre": "Comunicación PUES antes del primer llenado", "organismo": "Consejería Industria Junta Andalucía", "base_legal": "RD 919/2006 ITC-ICG 03 Apdo.5.6", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "El suministrador no puede llenar antes de la comunicación", "plataforma": "PUES", "obsoleta": False, "obsoleta_desde": None},
                {"orden": 5, "nombre": "Contrato mantenimiento", "organismo": "Empresa mantenedora", "base_legal": "RD 919/2006", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 6, "nombre": "Primer llenado por suministrador", "organismo": "Suministrador", "base_legal": "RD 919/2006", "plazo_estimado_dias": 7, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        },
        {
            "id": "AND-GAS-004",
            "descripcion": "GLP envases",
            "condicion": {"==": [{"var": "combustible"}, "glp_envases"]},
            "tramites": [
                {"orden": 1, "nombre": "Instalación por empresa habilitada", "organismo": "Empresa habilitada", "base_legal": "RD 919/2006 ITC-ICG 06", "plazo_estimado_dias": 0, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "", "plataforma": None, "obsoleta": False, "obsoleta_desde": None},
                {"orden": 2, "nombre": "Certificado instalación", "organismo": "Instalador", "base_legal": "RD 919/2006", "plazo_estimado_dias": 1, "plazo_legal_dias": None, "documentos_requeridos": [], "formulario_ref": None, "paralelo_con": None, "notas": "Sin comunicación administrativa. Titular e instalador conservan el certificado. Excepción: un único envase ≤15kg a aparato móvil no requiere ni esto.", "plataforma": None, "obsoleta": False, "obsoleta_desde": None}
            ]
        }
    ]
}

with open(BASE_DIR / "gas_baja_presion.json", "w", encoding="utf-8") as f:
    json.dump(gas, f, ensure_ascii=False, indent=2)

print("JSONs generados con éxito.")
