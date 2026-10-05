# ADR 0007 — Asturias, Baleares y Cantabria: proyecto en FV por encima de 10 kW, gas por potencia, organismos y plazos corregidos

**Fecha:** 2026-10-05 · **Estado:** aceptada (revisable al abrir a mano las fichas citadas) · **Origen:** Prompt B de verificación normativa (3 comunidades). Casi todas las fichas se leyeron por resumen o extracto (robots.txt): confianza media o baja salvo donde se indica.

## Decisiones

1. **FV en baja tensión: proyecto técnico por encima de 10 kW** (ITC-BT-04 §3.1; ficha oficial en PDF de Asturias). Mismo criterio que los ADR 0004-0006.
   - **Baleares:** `BAL-FV-001` pasa a ≤ 10 kW y se añade `BAL-FV-001P` (10-500 kW). El umbral de 500 kW solo exime de autorización, no de proyecto.
   - **Cantabria:** `CANT-FV-001` a ≤ 10 kW y `CANT-FV-001P` (10-100 kW).
   - **Asturias:** `AST-FV-001-A` y `-B` a ≤ 10 kW; nuevas `-A-P` / `-B-P` (10-25 kW) y `-A-Q` / `-B-Q` (más de 25 kW). Para más de 25 kW la ficha oficial pide certificado favorable de organismo de control; su base normativa es interpretativa (ITC-BT-05 §4.1, criterio de local mojado) y se marca así en el paso.
2. **Baleares: la autorización de más de 500 kW es el trámite SIA 216287 (ficha 2807998)**, distinto de la ficha 034 (que cubre hasta 500 kW). Plazo 6 meses con silencio positivo en la 034, UDIT-045 y UDIT-013 (silencio negativo en UDIT-021), tarifas 2024.
3. **Baleares ACS:** se quita la notificación a Salud Pública del ACS colectivo (`BAL-ACS-003` orden 2): solo se notifican torres de refrigeración y condensadores evaporativos (ficha 1298691; RD 487/2022, art. 5.3).
4. **Cantabria gas:** el trámite 599 exige proyecto y se aplicaba a todo el uso residencial. Ahora `CANT-GBP-001` es «hasta 70 kW y 5 bar» sin comunicación (ITC-ICG 07), `CANT-GBP-003` (nueva) recoge uso no industrial con proyecto y `CANT-GBP-002` industrial o terciario con proyecto. La partición ya no depende del uso. Los 30 días de la comunicación son plazo de presentación (`plazo_legal_dias` a null).
5. **Asturias gas:** igual criterio de plazo para las comunicaciones DECO0011T01.
6. **Organismos renombrados:** Baleares (Dirección General de Economía Circular, Transición Energética y Cambio Climático y Dirección General de Industria y Polígonos Industriales, Conselleria d'Empresa, Autònoms i Energia) y Asturias (Consejería de Ciencia, Industria y Empleo, Decreto 49/2025; fuente secundaria). Cantabria ya tenía el organismo vigente.
7. **Otros:** certificado final de obra obligatorio en IRVE con proyecto en Asturias; plataforma de baja tensión de Asturias; cita errónea del art. 9 del RD 244/2019 en Cantabria; nombres oficiales de RECE0050T01 y AUTO0301T01; el paso de organismo de control en térmicas > 70 kW de Baleares se conserva con aviso.

## No se hizo (decisión pendiente)

- **Registro de IRVE en zonas de acceso público (Baleares, SIA 2306622; Cantabria, trámite 5845):** falta una variable de acceso público.
- **Frigorífico (RSIF, RD 552/2019) en aerotermia** de Asturias y Cantabria: trámite no identificado.
- **Gas: comunes y acometidas > 2.000 kW y ampliaciones ≥ 30 %** (Baleares, Cantabria, Asturias): falta variable de clase de instalación.
- **Autoconsumo con/sin excedentes** (Cantabria; antivertido en Asturias) y umbral de autorización de Cantabria por encima de 100 kW (sin base autonómica verificada).
- **Fichas ilegibles** de Cantabria (3446, 180, 599, 438, 3482, 49) y Asturias (RECE0017T01, RECE0050T01, DECO0011T01, AUTO0301T01): plazos, silencio y tasas 2026 quedan en `huecos_verificacion`.

## Consecuencias y riesgo

- Más documentación para FV de 10 a 100/500 kW en las tres comunidades; menos pasos de gas ≤ 70 kW en Cantabria.
- Caso de referencia `asturias_fotovoltaica_15kw` actualizado (50 → 60 días) y marcado como pendiente de revisión humana.
- Trámites renombrados (Baleares AUTO >500 kW; Asturias RECE0050T01 y AUTO0301T01; Cantabria IRVE): pierden las estadísticas de plazos del nombre antiguo.
- Ningún nivel de verificación sube y `revisado_por` sigue vacío. Revertible con `git revert`.
