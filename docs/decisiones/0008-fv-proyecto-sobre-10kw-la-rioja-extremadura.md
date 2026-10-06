# ADR 0008 — La Rioja y Extremadura: proyecto en FV por encima de 10 kW, registro de autoconsumo y gas sin registro

**Fecha:** 2026-10-06 · **Estado:** aceptada (revisable al abrir a mano las fichas) · **Origen:** Prompt B. El resultado de Extremadura llegó cortado: solo se aplican FV e IRVE; climatización, ACS y gas de Extremadura siguen pendientes.

## Decisiones
1. **FV: proyecto por encima de 10 kW** (ITC-BT-04 §3.1; Instrucción 03/2023 de Extremadura, anexo 2). `RIO-FV-001` y `EXT-FV-001` a ≤ 10 kW; nuevas `RIO-FV-001P` y `EXT-FV-001P` (10-100 kW). Confianza media en La Rioja (fuente IDAE secundaria, sin norma riojana contraria).
2. **Extremadura:** el registro de autoconsumo ≤ 100 kW es de oficio dentro del CIP 5625 (FTD 16, AsistenteAGILE), no el CIP 5695; el tramo 100-500 kW exige autorización de explotación (CIP 5873, 3 meses, silencio desestimatorio); por encima de 500 kW hay dos fases. `tbtEX` no figura en la ficha vigente.
3. **La Rioja:** tasas de las fichas AUTee e IBT (29,45 € / 57,25 €); IBT con 3 meses y silencio estimatorio (media); organismo de control = cualquiera habilitado; «Resolución de desarrollo del RITE» sustituida por la Resolución de 10/11/2010; plataforma_url al listado del área.
4. **La Rioja gas:** se quita la inscripción GN-GL de `RIO-GAS-002` (≤ 70 kW y 5 bar sin proyecto): la norma estatal no exige comunicación y la ficha no se pudo leer (misma lógica que los ADR 0003 y 0007).

## No se hizo (decisión pendiente)
- **Plazo de las comunicaciones de Extremadura (CIP 5625: 3 meses, silencio desestimatorio):** se deja sin plazo legal por el criterio de comunicaciones; decisión editorial.
- **La Rioja:** paso previo IBT del autoconsumo, conexión en AT, garantías de acceso, Resolución de 2017, y recarga de terceros (n=24641, variable de acceso público).
- **Extremadura:** comunicación municipal (Ley 11/2018, art. 162), CIP 6043 / 5695, registro de acceso público.
- Fichas ilegibles de La Rioja (CL y CLM, GN-GL): plazos, tasas y documentos en `huecos_verificacion`.

## Consecuencias
Más documentación para FV de 10 a 100 kW. Ningún nivel sube y `revisado_por` sigue vacío. Revertible con `git revert`.
