# ADR 0005 — Galicia, Castilla y León y País Vasco: proyecto en FV por encima de 10 kW, gas sin registro por debajo de 70 kW, IRVE por BT

**Fecha:** 2026-10-05 · **Estado:** aceptada (revisable al abrir a mano las fichas citadas) · **Origen:** Prompt B de verificación normativa (3 comunidades)

## Decisiones

1. **FV en baja tensión: proyecto técnico por encima de 10 kW** (Galicia: ficha IN614C; Castilla y León: ITC-BT-04 §3.1 grupo c), «generadores y convertidores» de más de 10 kW). `GAL-FV-001` y `CYL-FV-001` pasan de «≤ 100 kW» a «≤ 10 kW» y se añaden `GAL-FV-001P` y `CYL-FV-001P` (10-100 kW). Mismo cambio que en Canarias (ADR 0004); Aragón, Madrid y Andalucía ya lo respetaban. El País Vasco ya estaba bien.
2. **Galicia FV: se añade el registro IN614C** (obligatorio para toda FV en BT, Orden de 23/07/2003 e Instrucciones 2/2021 y 1/2022) y se corrige IN407B (gratuito; aplica a potencia menor de 100 kW).
3. **Gas ≤ 70 kW sin registro ni declaración** (mismo criterio que el ADR 0003): se quitan el certificado por OCA y el registro IN625A de `GAL-GBP-001` (ficha IN625A: solo instalaciones con proyecto), la inscripción de `CYL-GBP-002` (ficha IAPA1496: «instalaciones receptoras ICG 07 con proyecto») y el certificado y puesta en servicio de `PV-GAS-002` (procedimiento IG de euskadi.eus: «con proyecto»). Casos de referencia `galicia_gas_35kw` (3 → 1 trámite) y `pais_vasco_gas_28kw` (3 → 2) actualizados y marcados como pendientes de revisión humana.
4. **País Vasco IRVE por el procedimiento BT-A**, no por el de generación (GE); se elimina la «autorización administrativa previa», que no existe para IRVE en BT.
5. **Castilla y León: RISE sustituye a BOEL y a la aplicación «RITE»** (solo consulta desde mayo de 2021); se quita la nota de «procedimiento voluntario» (la inscripción es preceptiva) y la notificación sanitaria de `CYL-ACS-003` (el art. 10 del RD 487/2022 no crea ninguna notificación; la del art. 5.3 es solo de torres y condensadores).
6. **Organismo en País Vasco**: Delegación Territorial de Administración Industrial; **Galicia**: Orden de 24/02/2010 como norma autonómica del RITE.

## No se hizo (decisión pendiente)

- **Galicia, País Vasco: autoconsumo con y sin excedentes.** Determina si hay autorización (Instrucción 2/2021; Decreto 48/2020, art. 2.3) y el fichero no tiene la variable.
- **Castilla y León, Decreto 25/2026** (hasta 500 kW solo autorización de explotación): visto en extracto de boletín y memoria, sin el texto íntegro; solo se añadió una nota.
- **Paso de organismo de control (> 70 kW)** en las tres comunidades: la ficha no lo pide para instalaciones nuevas, pero se conserva con aviso.
- **Gas con GLP o presión > 4 bar en Galicia** (la ficha dice 4 bar; el marco de la ITC-ICG 07, 5 bar).

## Consecuencias y riesgo

- Más documentación para FV de 10 a 100 kW en Galicia y Castilla y León; menos pasos de gas ≤ 70 kW en las tres. Si una ficha completa dijera otra cosa, la nota y el hueco conservan la cita.
- Seis trámites renombrados (IN622B, IN407B, IN625A, RISE y BT-A): pierden las estadísticas de plazos del nombre antiguo.
- Revertible con `git revert`.
