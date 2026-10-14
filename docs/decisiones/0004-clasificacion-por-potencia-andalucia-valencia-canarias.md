# ADR 0004 — Andalucía, Comunitat Valenciana y Canarias: la documentación depende de la potencia, no del uso, y las comunicaciones no tienen plazo de resolución

**Fecha:** 2026-10-04 · **Estado:** aceptada (revisable al abrir a mano las fichas citadas) · **Origen:** Prompt B de verificación normativa (3 comunidades)

## Contexto

La investigación externa encontró cuatro errores de clasificación con evidencia primaria, además de correcciones de datos (tasas, URL, organismos).

## Decisiones

1. **Canarias FV: proyecto por encima de 10 kW.** El Decreto 141/2009 (BOC 230/2009, texto original) y la guía de la sede exigen proyecto técnico para generación de más de 10 kW; la memoria M.T.D.E.R. solo vale hasta 10 kW. `ICAN-FV-001/001B` pasan de «≤ 100 kW» a «≤ 10 kW» y se añaden `ICAN-FV-001P/001BP` (10-100 kW: proyecto y certificado de dirección de obra, misma comunicación previa sin autorización). Antes un autoconsumo de 80 kW se presentaba solo con memoria.
2. **Andalucía: potencia, no uso.** La ficha técnica de térmicas (BOJA 105/2024) y el Manual de autoconsumo (nov-2025) clasifican solo por potencia. `AND-ACS-001-x` cubre 5-70 kW de cualquier uso y `AND-ACS-002-x` solo > 70 kW; `AND-FV-001` cubre ≤ 10 kW de cualquier uso y `AND-FV-002-x` exige > 10 kW; `AND-GAS-001/002` se dividen en ≤ 70 kW / > 70 kW sin mirar el uso. Antes, un comercio de 30 kW de ACS recibía proyecto e inspección de OCA.
3. **Andalucía ACS: se quita la notificación sanitaria** (`AND-ACS-003`, trámite 2). El art. 10 del RD 487/2022 no crea una notificación; la del art. 5.3 y Anexo II solo obliga a torres de refrigeración y condensadores evaporativos y, en Andalucía, va al Ayuntamiento (Decreto 287/2002). El trámite 1 pasa a llamarse PPCL.
4. **Comunitat Valenciana: gas ≤ 70 kW y ≤ 5 bar sin comunicación** (ficha 3192 e ITC-ICG 07; mismo criterio que el ADR 0003). Se quita el paso de `CV-GAS-002`. Caso de referencia `comunidad_valenciana_gas_25kw`: 3 → 2 trámites y 32 → 12 días.
5. **Plazos legales a `null`** en las comunicaciones de PUES (Andalucía; Orden de 5/03/2013, arts. 12-13: sin resolución ni silencio), en los 30 días del gas (Canarias, Comunitat Valenciana: plazo del titular, no de resolución).
6. **Andalucía ACS baja de `verificada` a `verificada_parcialmente`**: es el único fichero que declaraba el nivel más alto y tenía errores de fondo. Ningún fichero sube de nivel y `revisado_por` sigue vacío.

## Consecuencias y riesgo

- Cambia el resultado para: FV de Canarias entre 10 y 100 kW (más documentación); ACS, FV y gas no residenciales de Andalucía (menos documentación); gas ≤ 70 kW de la Comunitat Valenciana (un trámite menos). Si una ficha completa dijera otra cosa, el riesgo está en lo que se oculta: las notas conservan el criterio y la cita.
- Dos trámites se renombraron (PPCL en Andalucía; memoria técnica en Canarias): pierden las estadísticas de plazos del nombre antiguo.
- No se quitó el paso de comunicación del gas de Andalucía ni de Canarias: la ficha oficial no permite confirmarlo ni descartarlo (ver `huecos_verificacion`).
- Revertible con `git revert`.
