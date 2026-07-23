"""Siembra las reglas de validación pre-presentación en los JSONs de Andalucía
y añade un paralelo_con de ejemplo. Idempotente: sobrescribe la clave completa."""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1] / "motor_normativo" / "reglas" / "andalucia"

VALIDACIONES = {
    "fotovoltaica_autoconsumo": [
        {
            "id": "AND-FV-VAL-001",
            "severidad": "aviso",
            "campos_requeridos": ["potencia_kw"],
            "condicion": {">": [{"var": "potencia_kw"}, 100]},
            "mensaje": "Potencia superior a 100 kW: la instalación no puede acogerse al "
                       "mecanismo de compensación simplificada de excedentes.",
            "fuente": "RD 244/2019, art. 4 y 14",
            "validado_por": None,
        },
    ],
    "irve": [
        {
            "id": "AND-IRVE-VAL-001",
            "severidad": "error",
            "campos_requeridos": ["potencia_kw", "numero_puntos", "potencia_por_punto_kw"],
            "condicion": {"or": [
                {">": [{"-": [{"*": [{"var": "potencia_por_punto_kw"},
                                      {"var": "numero_puntos"}]},
                               {"var": "potencia_kw"}]}, 0.5]},
                {">": [{"-": [{"var": "potencia_kw"},
                               {"*": [{"var": "potencia_por_punto_kw"},
                                      {"var": "numero_puntos"}]}]}, 0.5]},
            ]},
            "mensaje": "La potencia total declarada no coincide con nº de puntos × potencia "
                       "por punto (tolerancia ±0,5 kW). Las discrepancias entre documentos "
                       "son causa habitual de requerimiento de subsanación.",
            "fuente": "Coherencia documental del expediente (guía de errores frecuentes PUES)",
            "validado_por": None,
        },
        {
            "id": "AND-IRVE-VAL-002",
            "severidad": "aviso",
            "campos_requeridos": ["acceso_publico", "potencia_kw"],
            "condicion": {"and": [
                {"==": [{"var": "acceso_publico"}, True]},
                {">=": [{"var": "potencia_kw"}, 50]},
            ]},
            "mensaje": "Punto de acceso público ≥ 50 kW: revise las obligaciones adicionales "
                       "de pago puntual e información de precios.",
            "fuente": "Reglamento (UE) 2023/1804 (AFIR), art. 5",
            "validado_por": None,
        },
        {
            "id": "AND-IRVE-VAL-003",
            "severidad": "aviso",
            "campos_requeridos": ["requiere_nuevo_suministro"],
            "condicion": {"==": [{"var": "requiere_nuevo_suministro"}, True]},
            "mensaje": "Requiere nuevo suministro o aumento de potencia: solicite acceso y "
                       "conexión a la distribuidora cuanto antes; su plazo no computa en los "
                       "plazos administrativos y suele ser el cuello de botella real.",
            "fuente": "RD 1183/2020, de acceso y conexión",
            "validado_por": None,
        },
    ],
    "gas_baja_presion": [
        {
            "id": "AND-GAS-VAL-001",
            "severidad": "aviso",
            "campos_requeridos": ["uso", "potencia_kw"],
            "condicion": {"and": [
                {"==": [{"var": "uso"}, "residencial"]},
                {">": [{"var": "potencia_kw"}, 70]},
            ]},
            "mensaje": "Uso residencial con potencia > 70 kW: configuración atípica que exige "
                       "proyecto técnico. Verifique que la potencia introducida es correcta.",
            "fuente": "RD 919/2006, ITC-ICG 07, apdo. 3.2",
            "validado_por": None,
        },
    ],
    "climatizacion_aerotermia": [
        {
            "id": "AND-CLIM-VAL-001",
            "severidad": "aviso",
            "campos_requeridos": ["uso", "potencia_kw"],
            "condicion": {"and": [
                {"==": [{"var": "uso"}, "residencial"]},
                {">": [{"var": "potencia_kw"}, 70]},
            ]},
            "mensaje": "Uso residencial con potencia térmica > 70 kW: configuración atípica "
                       "que exige proyecto técnico RITE en lugar de memoria. Verifique que la "
                       "potencia introducida es correcta.",
            "fuente": "RD 1027/2007 (RITE), art. 15",
            "validado_por": None,
        },
        {
            "id": "AND-CLIM-VAL-002",
            "severidad": "aviso",
            "campos_requeridos": ["potencia_kw"],
            "condicion": {">=": [{"var": "potencia_kw"}, 5]},
            "mensaje": "Instalación con refrigerantes: el Reglamento F-Gas (UE) 2024/573 "
                       "restringe progresivamente los refrigerantes de alto PCA y exige "
                       "personal frigorista certificado para la manipulación. Confirme el "
                       "refrigerante del equipo antes de presentar.",
            "fuente": "Reglamento (UE) 2024/573",
            "validado_por": None,
        },
    ],
    "acs": [
        {
            "id": "AND-ACS-VAL-001",
            "severidad": "aviso",
            "campos_requeridos": ["uso"],
            "condicion": {"!=": [{"var": "uso"}, "residencial"]},
            "mensaje": "ACS en edificio de uso colectivo o terciario: si la instalación tiene "
                       "acumulación y circuito de retorno, es obligatorio el Plan de Prevención "
                       "y Control de Legionella (PPCL) o Plan Sanitario del agua.",
            "fuente": "RD 487/2022, modificado por RD 614/2024",
            "validado_por": None,
        },
        {
            "id": "AND-ACS-VAL-002",
            "severidad": "aviso",
            "campos_requeridos": ["combustible"],
            "condicion": {"==": [{"var": "combustible"}, "gas"]},
            "mensaje": "ACS con caldera/calentador de gas: además del certificado RITE se "
                       "requiere el certificado de instalación de gas IRG-3, que es un "
                       "documento distinto y lo emite el instalador de gas habilitado.",
            "fuente": "RD 919/2006, ITC-ICG 07",
            "validado_por": None,
        },
    ],
}

# paralelo_con de ejemplo: en AND-GAS-001, la solicitud de acometida (orden 2)
# puede tramitarse en paralelo con la licencia municipal (orden 1) — organismos
# independientes. PENDIENTE de validación regulatoria por APH.
PARALELOS = {"gas_baja_presion": {"AND-GAS-001": {2: 1}}}


def main() -> None:
    for vertical, validaciones in VALIDACIONES.items():
        ruta = BASE_DIR / f"{vertical}.json"
        if not ruta.exists():
            print(f"[SKIP] No existe {ruta}, omitido")
            continue

        data = json.loads(ruta.read_text(encoding="utf-8"))
        data["validaciones"] = validaciones

        for regla in data.get("reglas", []):
            mapa = PARALELOS.get(vertical, {}).get(regla.get("id"), {})
            for t in regla.get("tramites", []):
                if t.get("orden") in mapa:
                    t["paralelo_con"] = mapa[t["orden"]]

        ruta.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[OK] {vertical}: {len(validaciones)} validaciones"
              + (" + paralelo_con" if vertical in PARALELOS else ""))


if __name__ == "__main__":
    main()
