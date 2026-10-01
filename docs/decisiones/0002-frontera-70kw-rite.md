# ADR 0002 — La frontera de 70 kW del RITE: proyecto solo por encima de 70 kW

**Fecha:** 2026-10-01 · **Estado:** aceptada (revisable si una lectura de `boe.es` lo contradice) · **Origen:** Prompt A de verificación normativa

## Contexto

El art. 15.1 del RITE (RD 1027/2007) fija: proyecto cuando la potencia térmica nominal es **mayor que 70 kW**; memoria técnica cuando es **mayor o igual que 5 kW y menor o igual que 70 kW**. Trece comunidades lo implementaban así (`> 70` / `<= 70`). Aragón, Baleares, Cataluña y Madrid, en ACS y climatización/aerotermia (8 ficheros, 16 nodos), usaban `>= 70` para el proyecto y `< 70` para la memoria: a 70,0 kW exigían un proyecto que la norma no pide. Aragón incluso lo anotaba como «corregido: el umbral RITE es >= 70 kW», y los tests de Cataluña fijaban ese comportamiento.

## Evidencia

- Texto del art. 15.1 reproducido por la investigación externa (cita literal) y por una búsqueda independiente de la misma redacción. La herramienta lo tomó de una web secundaria (Ecotec Ingenieros), no del consolidado de `boe.es`, al que no tenemos acceso.
- Coherencia interna: el propio art. 15.1.c, que ya está en `test_umbral_rite_5kw.py`, usa «menor o igual que 70 kW» (inclusivo) para las exenciones de ACS, y las otras 13 comunidades.

## Decisión

Proyecto si `potencia_kw > 70`; memoria técnica si `5 <= potencia_kw <= 70`. Versión de cada fichero afectado: +0.0.1. Tests de Cataluña actualizados (a 70,0 → MTD; a 70,01 → proyecto) y `tests/test_umbral_rite_70kw.py` recorre los 34 ficheros de ACS y climatización para impedir `>= 70` / `< 70`.

## Consecuencias y riesgo

- Solo cambia el resultado para una potencia de **exactamente 70 kW**. Es un cambio revertible con `git revert`.
- Si una norma autonómica fijara legítimamente un umbral más estricto (≥ 70 kW), habría que documentarlo en la regla con su cita y excluir ese fichero del test. No se ha encontrado ninguna.
- Cotejar el art. 15.1 en el consolidado de `boe.es` sigue pendiente (ver `docs/normativa/verificacion-2026-10-01.md`).

## Adenda 2026-10-01 (Prompt B Madrid)

La herramienta leyó directamente el art. 15.1 en el BOE («sea mayor que 70 kW, se requerirá la realización de un proyecto»; «mayor o igual que 5 kW y menor o igual que 70 kW» para la memoria), lo que refuerza la decisión. Pero la **ficha oficial de la sede de Madrid** describe el proyecto como «igual o superior a 70 kW». La norma estatal manda, pero en la práctica la EICI de Madrid podría exigir proyecto a 70,0 kW exactos. Se deja como hueco de verificación en `madrid/acs.json` y `madrid/climatizacion_aerotermia.json`; si la Dirección General confirma el criterio de la sede, Madrid debería volver a `>= 70` con su cita y quedar fuera del test `test_umbral_rite_70kw.py` por excepción documentada.

## Adenda 2026-10-01 (Prompt B Cataluña)

La FAQ de Canal Empresa (Generalitat), que la herramienta pudo leer, dice: «Fins als 70 kW (tèrmics), inclòs: la memòria i la certificació de la instal·lació» y «Amb una potència superior als 70 kW: el projecte». Es la **segunda administración autonómica** (tras la lectura directa del BOE) que respalda `> 70` / `<= 70`. Queda Madrid como único caso con una ficha oficial que dice «igual o superior a 70 kW».
