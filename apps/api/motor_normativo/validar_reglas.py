#!/usr/bin/env python3
"""
Validador del motor normativo de PermitFlow ES.

Uso:  python validar_reglas.py <ruta a motor_normativo/reglas>

Comprueba defectos que hacen que un fichero falle en produccion o que
devuelva planes vacios sin avisar. Salida: informe por fichero + resumen.
"""
import json, re, sys, pathlib
from itertools import product

# ─── Contrato real del backend (apps/api/schemas/clasificador.py) ────────────
# Mantener sincronizado a mano con ClasificadorInput. Última sincronización:
# 2026-07-28, tras detectar que esta lista llevaba ~25 campos reales sin
# incluir (generaba falsos positivos de "variable fantasma") y que no
# capturaba el desajuste real de `modalidad_autoconsumo` (ver VALORES).
CAMPOS_INPUT = {
    "tipo_instalacion", "comunidad", "potencia_kw", "superficie_m2", "uso",
    "municipio", "combustible", "presion_bar", "numero_puntos",
    "potencia_por_punto_kw", "modo_recarga", "acceso_publico",
    "ubicacion_irve", "requiere_nuevo_suministro", "modalidad",
    "modalidad_autoconsumo", "implantacion", "solicita_ayuda", "tension",
    "acumulacion", "recirculacion", "uso_colectivo", "inversion_eur",
    "clase_instalacion_gas", "presion_operacion_bar", "es_ampliacion",
    "incremento_potencia_pct", "potencia_resultante_kw",
    "presion_resultante_bar", "combustible_gas",
    "instalacion_origen_modificada", "garaje_sujeto_inspeccion_periodica",
    "numero_suministros_edificio", "requiere_inspeccion_inicial_oc",
    "acs_centralizada", "dispone_acumulacion", "dispone_circuito_retorno",
    "nivel_tension_consumidor", "nivel_tension_generacion",
    "nivel_tension_conexion", "requiere_registro_produccion",
    "incluida_ambito_rd_487_2022", "incluida_ambito_legionella",
    "uso_edificio", "ventilacion_garaje", "numero_plazas_garaje",
    "garaje_existente", "ubicacion_suelo", "requiere_acceso_conexion",
}
SLUGS = {
    "andalucia","aragon","asturias","baleares","canarias","cantabria",
    "castilla_la_mancha","castilla_leon","cataluna","comunidad_valenciana",
    "extremadura","galicia","la_rioja","madrid","murcia","navarra","pais_vasco",
}
TIPOS = {"fotovoltaica_autoconsumo","irve","climatizacion_aerotermia","acs","gas_baja_presion"}
MODALIDAD_DOC = {"nueva","ampliacion","modificacion","legalizacion"}

# Lenguaje operativo de agente que no debe llegar al usuario final
PATRONES_OPERATIVOS = [
    r"derivar a portal", r"prohibido el enrutamiento", r"bloqueo de redirecc",
    r"no enviar a", r"solo enviar a", r"redirecc", r"intranet\.",
    r"frente al lote", r"LOTE \d", r"generado autom",
]

def ev(logic, data, usadas):
    """Evaluador json-logic minimo que registra las variables consultadas."""
    if not isinstance(logic, dict):
        return logic
    op, args = next(iter(logic.items()))
    if not isinstance(args, list):
        args = [args]
    if op == "var":
        usadas.add(args[0])
        return data.get(args[0])
    v = [ev(a, data, usadas) for a in args]
    try:
        if op == "and": return all(v)
        if op == "or":  return any(v)
        if op == "!":   return not v[0]
        if op == "==":  return v[0] == v[1]
        if op == "!=":  return v[0] != v[1]
        if op == "in":  return v[0] in v[1] if v[1] is not None else False
        if len(v) < 2 or v[0] is None or v[1] is None: return False
        if op == "<":   return v[0] <  v[1]
        if op == "<=":  return v[0] <= v[1]
        if op == ">":   return v[0] >  v[1]
        if op == ">=":  return v[0] >= v[1]
    except TypeError:
        return False
    raise ValueError(f"operador no soportado: {op}")

def variables_de(cond, acc=None):
    """Extrae las variables referenciadas en una condición JsonLogic."""
    acc = set() if acc is None else acc
    if isinstance(cond, dict):
        for op, args in cond.items():
            if op == "var":
                acc.add(args if isinstance(args, str) else args[0])
            else:
                for a in (args if isinstance(args, list) else [args]):
                    variables_de(a, acc)
    return acc

# Fronteras por campo — el producto se hace SOLO sobre las variables que usa cada regla
VALORES = {
    "potencia_kw": [2, 3, 10, 10.001, 15, 15.001, 30, 70, 100, 100.001, 500, 500.001, 1000],
    "uso": ["residencial", "terciario", "industrial"],
    "modalidad": list(MODALIDAD_DOC) + [None],
    "tension": ["BT", "AT", None],
    # Corregido 2026-07-28: los valores reales del Literal en
    # schemas/clasificador.py son estos tres, no "con_excedentes" a secas
    # (ese valor no pasa la validación de Pydantic; ver bug de frontend).
    "modalidad_autoconsumo": [
        "sin_excedentes",
        "con_excedentes_sin_compensacion",
        "con_excedentes_con_compensacion",
        None,
    ],
    "acceso_publico": [True, False],
    "requiere_nuevo_suministro": [True, False],
    "solicita_ayuda": [True, False],
    "inversion_eur": [0, 5000, 6010.12, 6010.13, 60000, 60001, 400000, 700000, 2000000, None],
    "numero_puntos": [1, 2, 10, None],
    "potencia_por_punto_kw": [7, 22, 50, None],
    "modo_recarga": ["3", "4", None],
    # "via_publica" faltaba pese a ser un valor real del Literal en
    # schemas/clasificador.py -> MAD-IRVE-VIA-PUBLICA se marcaba "nunca dispara".
    "ubicacion_irve": ["interior", "exterior", "garaje_comunitario", "via_publica", None],
    "combustible": ["gas_natural", "glp", None],
    # Incluye los valores crudos de entrada ("normal"/"5+", tal como llegan del
    # formulario) y sus equivalentes normalizados (0.0/6.0), que es lo que
    # motor_normativo/clasificador.py realmente pasa al evaluador json-logic
    # tras normalizar presion_bar (líneas 98-105). Sin los valores float, las
    # reglas ya corregidas para comparar numéricamente (p.ej. La Rioja,
    # RIO-GAS-001/002/003) se marcaban como falso "nunca dispara", porque este
    # validador (a diferencia del motor real) no normaliza antes de evaluar.
    "presion_bar": ["normal", "5+", 0.0, 6.0, None],
    "implantacion": ["cubierta", "suelo", None],
    "superficie_m2": [50, 100, 500, None],
    # "barcelona" añadido: hay reglas municipales específicas (p.ej.
    # CAT-IRVE-VIA-PUBLICA-BARCELONA) que de lo contrario nunca se barren.
    "municipio": ["X", "barcelona"],
    "acumulacion": [True, False, None],
    "recirculacion": [True, False, None],
    "uso_colectivo": [True, False, None],
    # Añadidos 2026-07-28 al corregir Canarias: sin estas entradas, las reglas
    # que bifurcan por 'instalacion_origen_modificada' (3158 vs 6782) o que
    # activan la regla de Legionella ('incluida_ambito_rd_487_2022') nunca
    # verían el caso True en el barrido y se marcarian como "nunca disparan".
    "instalacion_origen_modificada": [True, False, None],
    "incluida_ambito_rd_487_2022": [True, False, None],
    # Añadidos 2026-07-28 al corregir Cataluña/Madrid: estos campos estaban en
    # CAMPOS_INPUT (lista blanca) pero no aquí, así que el barrido nunca los
    # variaba y cualquier regla condicionada por ellos podía marcarse como
    # "nunca dispara" por falso negativo del propio validador, no del JSON.
    "nivel_tension_consumidor": ["bt", "at", None],
    "nivel_tension_generacion": ["bt", "at", None],
    "nivel_tension_conexion": ["bt", "at", None],
    "clase_instalacion_gas": ["individual", "comun", "conexion_servicio", None],
    "presion_operacion_bar": [0.02, 0.05, 4, 5, 6, None],
    "es_ampliacion": [True, False],
    "incremento_potencia_pct": [0, 10, 50, None],
    "potencia_resultante_kw": [10, 24, 70, 100, None],
    "presion_resultante_bar": [0.02, 0.05, 5, 6, None],
    "combustible_gas": ["gas_natural", "glp", None],
    "garaje_sujeto_inspeccion_periodica": [True, False, None],
    "numero_suministros_edificio": [1, 10, 20, 21, None],
    "requiere_inspeccion_inicial_oc": [True, False, None],
    "acs_centralizada": [True, False, None],
    "dispone_acumulacion": [True, False, None],
    "dispone_circuito_retorno": [True, False, None],
    "requiere_registro_produccion": [True, False],
    "incluida_ambito_legionella": [True, False, None],
    "uso_edificio": ["residencial", "no_residencial", None],
    "ventilacion_garaje": ["natural", "forzada", None],
    "numero_plazas_garaje": [1, 20, 50, None],
    "garaje_existente": [True, False, None],
    "ubicacion_suelo": ["urbanizado", "no_urbanizable", None],
    "requiere_acceso_conexion": [True, False, None],
}

# Valores por defecto para campos no barridos en un caso concreto
DEFAULTS = {
    "potencia_kw": 10, "uso": "residencial", "municipio": "X",
    "superficie_m2": 100, "solicita_ayuda": False, "tension": "BT",
    "modalidad_autoconsumo": None, "numero_puntos": 2,
    "potencia_por_punto_kw": 22, "modo_recarga": "3",
    "acceso_publico": False, "ubicacion_irve": "exterior",
    "requiere_nuevo_suministro": False, "combustible": "gas_natural",
    # Normalizado (equivalente a "normal" tras el paso de normalización de
    # motor_normativo/clasificador.py), no la cadena cruda — ver nota en VALORES.
    "presion_bar": 0.0, "implantacion": "cubierta",
    "modalidad": None, "inversion_eur": 5000,
    "acumulacion": None, "recirculacion": None, "uso_colectivo": None,
    "instalacion_origen_modificada": False, "incluida_ambito_rd_487_2022": None,
    "nivel_tension_consumidor": "bt", "nivel_tension_generacion": "bt",
    "nivel_tension_conexion": "bt", "clase_instalacion_gas": None,
    "presion_operacion_bar": None, "es_ampliacion": False,
    "incremento_potencia_pct": 0, "potencia_resultante_kw": None,
    "presion_resultante_bar": None, "combustible_gas": "gas_natural",
    "garaje_sujeto_inspeccion_periodica": None, "numero_suministros_edificio": None,
    "requiere_inspeccion_inicial_oc": None, "acs_centralizada": None,
    "dispone_acumulacion": None, "dispone_circuito_retorno": None,
    "requiere_registro_produccion": False, "incluida_ambito_legionella": None,
    "uso_edificio": None, "ventilacion_garaje": None,
    "numero_plazas_garaje": None, "garaje_existente": None,
    "ubicacion_suelo": None, "requiere_acceso_conexion": None,
}

# Contexto del fichero que se está auditando en cada momento (tipo_instalacion
# y comunidad son constantes DENTRO de un fichero — el motor real siempre las
# tiene en eval_locals porque son campos obligatorios de ClasificadorInput,
# pero no son "variables a barrer" como potencia_kw). Sin esto, cualquier
# regla cuya condicion compare `tipo_instalacion`/`comunidad` (redundante con
# el propio fichero, pero válido) se marcaba como falso "nunca dispara".
_CTX = {"tipo_instalacion": None, "comunidad": None}

def casos_por_regla(cond):
    """Producto cartesiano SOLO de las variables que esta regla usa (típ. ≤4)."""
    vars_usadas = variables_de(cond) & set(VALORES.keys())
    if not vars_usadas:
        yield dict(DEFAULTS, **_CTX)
        return
    campos = sorted(vars_usadas)
    listas = [VALORES.get(c, [None]) for c in campos]
    for combo in product(*listas):
        caso = dict(DEFAULTS, **_CTX)
        for c, v in zip(campos, combo):
            caso[c] = v
        yield caso

def casos_cobertura_global():
    """Barrido reducido para detectar planes vacíos: potencia × uso × tensión × inversión."""
    for p, u, t, inv in product(
        VALORES["potencia_kw"], VALORES["uso"], VALORES["tension"],
        [0, 5000, 60001, 700000, None],
    ):
        caso = dict(DEFAULTS, **_CTX)
        caso.update({"potencia_kw": p, "uso": u, "tension": t, "inversion_eur": inv})
        yield caso


def auditar(path: pathlib.Path):
    inc = []
    d = json.loads(path.read_text(encoding="utf-8"))
    dir_slug = path.parent.name

    # Fijar el contexto de este fichero para que casos_por_regla/
    # casos_cobertura_global simulen tipo_instalacion/comunidad reales.
    _CTX["tipo_instalacion"] = d.get("tipo_instalacion")
    _CTX["comunidad"] = d.get("comunidad")

    # 1. slug de comunidad
    com = d.get("comunidad")
    if com not in SLUGS:
        inc.append(("BLOQUEANTE", f"'comunidad': \"{com}\" no es un slug valido "
                    f"(el directorio es '{dir_slug}')"))
    elif com != dir_slug:
        inc.append(("BLOQUEANTE", f"'comunidad' ({com}) != directorio ({dir_slug})"))

    # 2. tipo_instalacion
    if d.get("tipo_instalacion") not in TIPOS:
        inc.append(("BLOQUEANTE", f"'tipo_instalacion': \"{d.get('tipo_instalacion')}\" invalido"))

    # 3. variables usadas frente al contrato + alcanzabilidad (por regla)
    vars_totales, nunca = set(), []
    for r in d.get("reglas", []):
        usadas, disparos = set(), 0
        casos_r = list(casos_por_regla(r["condicion"]))
        for c in casos_r:
            try:
                if ev(r["condicion"], c, usadas):
                    disparos += 1
            except ValueError as e:
                inc.append(("BLOQUEANTE", f"regla {r['id']}: {e}"))
                break
        vars_totales |= usadas
        if disparos == 0:
            nunca.append(r["id"])

    fantasma = vars_totales - CAMPOS_INPUT
    if fantasma:
        inc.append(("BLOQUEANTE", f"variables inexistentes en ClasificadorInput: "
                    f"{sorted(fantasma)} -> siempre None -> las condiciones que las usan son falsas"))
    if nunca:
        inc.append(("BLOQUEANTE", f"reglas que NUNCA disparan: {nunca}"))

    # cobertura global: barrido reducido para detectar "planes vacíos"
    casos_glob = list(casos_cobertura_global())
    cobertura = {i: 0 for i in range(len(casos_glob))}
    for r in d.get("reglas", []):
        for i, c in enumerate(casos_glob):
            dummy = set()
            try:
                if ev(r["condicion"], c, dummy):
                    cobertura[i] += 1
            except ValueError:
                pass
    huerfanos = sum(1 for v in cobertura.values() if v == 0)
    if huerfanos:
        pct = 100 * huerfanos / len(casos_glob)
        inc.append(("BLOQUEANTE" if pct > 50 else "GRAVE",
                    f"{huerfanos}/{len(casos_glob)} casos ({pct:.0f}%) no activan ninguna regla -> plan vacio"))

    # 4. modalidad usada con valores no documentados
    txt = json.dumps(d, ensure_ascii=False)
    for m in re.findall(r'"var":\s*"modalidad"\}[^}]*?"([a-z_]+)"', txt):
        if m not in MODALIDAD_DOC:
            inc.append(("GRAVE", f"'modalidad' comparada con \"{m}\", que no esta entre "
                        f"los valores documentados {sorted(MODALIDAD_DOC)}"))

    # 5. coherencia de nivel_verificacion
    # Corregido 2026-07-28: esta lista solo tenía 2 de los 6 valores reales
    # que acepta ClasificadorOutput.nivel_verificacion en schemas/clasificador.py,
    # generando un GRAVE falso en todo fichero marcado 'en_revision' o
    # 'verificada_parcialmente' (estados legítimos y ya usados en producción).
    NIVELES_VERIFICACION_VALIDOS = {
        "verificada", "verificada_parcialmente", "verificado_con_observaciones",
        "en_revision", "borrador_verificado_parcialmente", "generica",
    }
    nv = d.get("nivel_verificacion")
    if nv not in NIVELES_VERIFICACION_VALIDOS:
        inc.append(("GRAVE", f"'nivel_verificacion' ausente o invalido: {nv}"))
    if nv == "verificada":
        for r in d.get("reglas", []):
            for t in r.get("tramites", []):
                ce = (t.get("coste_estimado") or "")
                if re.search(r"no verificad|consultar|no confirmad|presuntamente|sin restricciones", ce, re.I):
                    inc.append(("GRAVE", f"fichero marcado 'verificada' pero {r['id']} tiene "
                                f"coste_estimado no verificado: \"{ce[:70]}...\""))
                if re.search(r"no confirmad|presuntamente|no verificad", (t.get("notas") or ""), re.I):
                    inc.append(("GRAVE", f"fichero 'verificada' pero {r['id']} declara incertidumbre en notas"))

    # 6. coste_estimado ambiguo para el parser de presupuestos
    for r in d.get("reglas", []):
        for t in r.get("tramites", []):
            ce = t.get("coste_estimado") or ""
            imp = re.findall(r"(\d+[.,]?\d*)\s*EUR", ce)
            if len(imp) > 1:
                inc.append(("GRAVE", f"{r['id']}: coste_estimado con {len(imp)} importes "
                            f"{imp} -> el regex del generador tomara el primero ({imp[0]})"))
            if re.search(r"\d+\s*EUR\s*/\s*kW", ce):
                inc.append(("GRAVE", f"{r['id']}: coste_estimado contiene 'EUR/kW'; "
                            f"se parseara como importe fijo"))

    # 7. campos del schema que el proyecto threadea deliberadamente
    faltan = set()
    for r in d.get("reglas", []):
        for t in r.get("tramites", []):
            for campo in ("paralelo_con",):
                if campo not in t:
                    faltan.add(campo)
    if faltan:
        inc.append(("AVISO", f"trámites sin los campos {sorted(faltan)} presentes en TramiteOutput"))

    # 8. lenguaje operativo filtrado a contenido de usuario
    for r in d.get("reglas", []):
        for t in r.get("tramites", []):
            for pat in PATRONES_OPERATIVOS:
                if re.search(pat, (t.get("notas") or ""), re.I):
                    inc.append(("GRAVE", f"{r['id']}: 'notas' contiene lenguaje operativo de agente "
                                f"(patron /{pat}/) que acabara en el PDF del cliente"))
                    break

    # 9. coherencia plataforma / plataforma_url
    for r in d.get("reglas", []):
        for t in r.get("tramites", []):
            p, u = t.get("plataforma") or "", t.get("plataforma_url") or ""
            dom = re.findall(r"([a-z0-9.-]+\.[a-z]{2,})", p)
            if dom and u and not any(x.split(".")[-2] in u for x in dom if "." in x):
                inc.append(("AVISO", f"{r['id']}: 'plataforma' menciona {dom} pero la URL apunta a otro dominio"))
    return d, inc

def main(raiz):
    ficheros = sorted(pathlib.Path(raiz).rglob("*.json"))
    if not ficheros:
        print(f"No se encontraron JSON en {raiz}"); return
    prefijos, tot = {"BLOQUEANTE": 0, "GRAVE": 0, "AVISO": 0}, {"BLOQUEANTE": 0, "GRAVE": 0, "AVISO": 0} # Fix bug in original script: prefijos was empty
    prefijos_ids = {} # For prefix mapping
    for f in ficheros:
        d, inc = auditar(f)
        for r in d.get("reglas", []):
            pre = r["id"].split("-")[0]
            prefijos_ids.setdefault(pre, set()).add(f.parent.name)
        etiqueta = f"{f.parent.name}/{f.name}"
        if inc:
            print(f"\n{'='*70}\n{etiqueta}")
            for sev, m in sorted(inc, key=lambda x: ["BLOQUEANTE","GRAVE","AVISO"].index(x[0])):
                tot[sev] += 1
                print(f"  [{sev:11}] {m}")
        else:
            print(f"\n{etiqueta}: sin incidencias")
    for pre, coms in prefijos_ids.items():
        if len(coms) > 1:
            print(f"\n[BLOQUEANTE] prefijo de id '{pre}' compartido por {sorted(coms)} "
                  f"-> regla_id no es unico; el indice de duraciones mezclaria comunidades")
            tot["BLOQUEANTE"] += 1
    print(f"\n{'='*70}\nRESUMEN  {len(ficheros)} ficheros | "
          f"bloqueantes {tot['BLOQUEANTE']} | graves {tot['GRAVE']} | avisos {tot['AVISO']}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
