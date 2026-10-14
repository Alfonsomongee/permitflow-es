# ADR 0006 — Murcia, Navarra y Castilla-La Mancha: proyecto en FV por encima de 10 kW, organismos y plazos corregidos

**Fecha:** 2026-10-05 · **Estado:** aceptada (revisable al abrir a mano las fichas citadas) · **Origen:** Prompt B de verificación normativa (3 comunidades)

## Decisiones

1. **FV en baja tensión: proyecto técnico por encima de 10 kW** (ITC-BT-04 §3.1; ficha 1002270 en Castilla-La Mancha). `MUR-FV-001`, `NAV-FV-001` y `CLM-FV-001` pasan de «≤ 100 kW» a «≤ 10 kW» y se añaden `MUR-FV-001P`, `NAV-FV-001P` y `CLM-FV-001P` (10-100 kW) con el proyecto y el certificado de dirección de obra. Mismo criterio que los ADR 0004 y 0005. En Navarra la confianza es media (no se halló norma foral que cambie el corte).
2. **Murcia: organismo y nombres.** La Dirección General de Industria, Energía y Minas sustituye al nombre antiguo de la DG; el registro térmico es la ficha 61 «Registro de instalaciones térmicas en los edificios» (declaración responsable, no «comunicación») y el eléctrico el procedimiento 19. El certificado de instalación de gas lo emite la empresa instaladora, no un OCA (RD 919/2006, art. 5).
3. **Navarra: organismo** (Servicio de Ordenación Industrial, Infraestructuras Energéticas y Minas) y registro de gas con su nombre oficial. La OF 64/2022 solo regula inspecciones de instalaciones térmicas, así que se quita de la base legal del gas. El certificado de instalación de BT no lo emite un organismo de control.
4. **Castilla-La Mancha: organismo y plataformas.** Registro en la Delegación Provincial (la DG de Transición Energética gestiona la herramienta eDice); eDice-Térmicas / eDice-bt sin proyecto y ventanillas SJE4 / SJE6 con proyecto. La ficha 1002260 confirma que el gas sin proyecto no requiere comunicación; los 30 días son el plazo del titular, no de resolución (`plazo_legal_dias` a null).
5. **Paso de organismo de control** (térmicas > 70 kW, FV de Navarra): la ficha oficial no lo pide para instalaciones nuevas; se conserva con aviso (RITE arts. 24.1.c y 30.1).

## No se hizo (decisión pendiente)

- **Gas ≤ 70 kW individual en Murcia (ficha 60) y Navarra (modelo IRG-3):** las fichas incluyen un registro para la receptora individual, en conflicto con la ITC-ICG 07 §3.6. No se añadió ningún paso; queda en `huecos_verificacion`.
- **Castilla-La Mancha, autoconsumo con excedentes > 100 kW (`CLM-FV-002`):** faltan SJ9M, SJ9T y MLG8. Requiere la variable con/sin excedentes, que el esquema no tiene.
- **Comunes y acometidas > 2.000 kW y ampliaciones > 30 %** en los ficheros de gas.
- **Murcia FV:** solicitud de CAU, permiso de acceso y conexión y notificación del proyecto (la nota de la CARM es de 2021).

## Consecuencias y riesgo

- Más documentación para FV de 10 a 100 kW en las tres comunidades.
- Varios trámites renombrados (registro térmico y de gas en Murcia y Navarra, eDice en CLM): pierden las estadísticas de plazos del nombre antiguo.
- Ningún nivel de verificación sube y `revisado_por` sigue vacío.
- Revertible con `git revert`.
