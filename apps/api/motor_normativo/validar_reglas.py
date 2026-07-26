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
CAMPOS_INPUT = {
    "tipo_instalacion", "comunidad", "potencia_kw", "superficie_m2", "uso",
    "municipio", "combustible", "presion_bar", "numero_puntos",
    "potencia_por_punto_kw", "modo_recarga", "acceso_publico",
    "ubicacion_irve", "requiere_nuevo_suministro", "modalidad",
    "modalidad_autoconsumo", "implantacion", "solicita_ayuda", "tension",
    "acumulacion", "recirculacion", "uso_colectivo", "presupuesto_eur",
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
        if v[0] is None or v[1] is None: return False
        if op == "<":   return v[0] <  v[1]
        if op == "<=":  return v[0] <= v[1]
        if op == ">":   return v[0] >  v[1]
        if op == ">=":  return v[0] >= v[1]
    except TypeError:
        return False
    raise ValueError(f"operador no soportado: {op}")

def casos_prueba():
    """Barrido de entradas realistas usando SOLO campos que existen."""
    pot = [3, 10, 10.001, 15, 15.001, 70, 100, 100.001, 500, 500.001, 1000]
    usos = ["residencial", "terciario", "industrial"]
    mods = list(MODALIDAD_DOC) + [None]
    tension = ["BT", "AT", None]
    mod_auto = ["sin_excedentes", "con_excedentes", None]
    acc_pub = [True, False]
    req_sum = [True, False]
    sol_ayu = [True, False]
    pres = [1000, 5000, 10000, 70000, 400000, 700000, 2000000]
    
    for p, u, m, t, ma, ap, rs, sa, pr in product(pot, usos, mods, tension, mod_auto, acc_pub, req_sum, sol_ayu, pres):
        yield {
            "potencia_kw": p, "uso": u, "modalidad": m, "municipio": "X",
            "superficie_m2": 100, "solicita_ayuda": sa, "tension": t,
            "modalidad_autoconsumo": ma,
            "numero_puntos": 2, "potencia_por_punto_kw": 22,
            "modo_recarga": "3", "acceso_publico": ap,
            "ubicacion_irve": "exterior", "requiere_nuevo_suministro": rs,
            "combustible": "gas_natural", "presion_bar": "normal",
            "implantacion": "cubierta", "presupuesto_eur": pr
        }

def auditar(path: pathlib.Path):
    inc = []
    d = json.loads(path.read_text(encoding="utf-8"))
    dir_slug = path.parent.name

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

    # 3. variables usadas frente al contrato + alcanzabilidad
    casos = list(casos_prueba())
    vars_totales, nunca, cobertura = set(), [], {c_i: 0 for c_i in range(len(casos))}
    for r in d.get("reglas", []):
        usadas, disparos = set(), 0
        for i, c in enumerate(casos):
            try:
                if ev(r["condicion"], c, usadas):
                    disparos += 1
                    cobertura[i] += 1
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
    huerfanos = sum(1 for v in cobertura.values() if v == 0)
    if huerfanos:
        pct = 100 * huerfanos / len(casos)
        inc.append(("BLOQUEANTE" if pct > 50 else "GRAVE",
                    f"{huerfanos}/{len(casos)} casos ({pct:.0f}%) no activan ninguna regla -> plan vacio"))

    # 4. modalidad usada con valores no documentados
    txt = json.dumps(d, ensure_ascii=False)
    for m in re.findall(r'"var":\s*"modalidad"\}[^}]*?"([a-z_]+)"', txt):
        if m not in MODALIDAD_DOC:
            inc.append(("GRAVE", f"'modalidad' comparada con \"{m}\", que no esta entre "
                        f"los valores documentados {sorted(MODALIDAD_DOC)}"))

    # 5. coherencia de nivel_verificacion
    nv = d.get("nivel_verificacion")
    if nv not in ("verificada", "generica"):
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
            for campo in ("paralelo_con", "regla_id"):
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
