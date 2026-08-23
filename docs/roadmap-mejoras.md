# Roadmap de mejoras — PermitFlow ES

Documento vivo. Consolida dos sesiones independientes de product discovery
(2026-08-21): la hoja de ruta original (equipo PM/fundador/consultor
energético/regulación/growth/innovación/UX) y una segunda pasada de
discovery centrada en activos de datos ya existentes
(`estadisticas_plazos`, `subsanaciones`, `riesgo_normativo`). Se han
fusionado las ideas duplicadas entre ambas y corregido dos afirmaciones que
no eran ciertas contra el código real en el momento de escribir esto (ver
notas en QW-05 y EXP-05).

**Cómo mantenerlo**: cada vez que se empieza o se cierra una pieza de
trabajo, actualizar su fila aquí en el mismo commit/PR que toca el código.
No es un documento de referencia pasiva — es el registro de qué está hecho.

**Leyenda**: ✅ Hecho · 🔶 Parcial · 🔄 En progreso · ⬜ Pendiente

---

## 0. Hallazgos críticos de auditoría (2026-08-23)

Auditoría contra **producción real** (Supabase advisors + `count(*)` + historial
de GitHub Actions), no contra el código. Todo lo de abajo está verificado con
evidencia; nada es inferencia.

El patrón de fondo no es ninguno de los bugs por separado: es que **el repo y
producción han divergido** y no hay nada que lo detecte. Hay migraciones
commiteadas que nunca se aplicaron y un job crítico lleva casi un mes en rojo
sin que salte ninguna alarma.

| ID | Hallazgo | Estado | Gravedad | Evidencia y detalle |
|----|----------|--------|----------|---------------------|
| AUD-01 | Pipeline BOE lleva **7 ejecuciones seguidas fallando** (desde el 30-jul; última verde el 27-jul) | ✅ Corregido (falta secreto) | **Crítica** | El motor de inteligencia normativa —el diferenciador del producto— lleva ~3,5 semanas sin producir nada. Causa del último run: `boe_pipeline.py:44` importa `config.settings`, cuyo `Settings` exige `SECRET_KEY`, y el bloque `env:` del workflow no lo pasaba → `ValidationError` en el import, exit 1 en ~13s. Los fallos del 30-jul al 9-ago tienen **otra causa distinta** (esa línea se añadió en `fe480dc`, 9-ago): han sido al menos dos roturas encadenadas. Corregido el `env:` + preflight de secretos + aviso por email en `if: failure()`. **Pendiente del usuario**: el log muestra `SUPABASE_SERVICE_ROLE_KEY: ''` — el secreto está vacío en GitHub, así que aunque arranque no podrá escribir en `alertas_boe`. |
| AUD-02 | `newsletter_suscriptores` sin RLS y con `anon` pudiendo `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` | ✅ Migración escrita | **Crítica** | La anon key viaja en el bundle del navegador (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Cualquiera podía leer la lista completa de correos (dato personal → RGPD) **y borrarla o truncarla**. Hoy 0 filas: el agujero es real pero aún no se ha filtrado nada. Migración `20260823100000`. |
| AUD-03 | `organizaciones` sin RLS, con `anon: SELECT` | ✅ Migración escrita | Alta | Exponía `nombre`, `plan`, `suscripcion_activa`, `clerk_org_id` de todos los clientes (lista de clientes + quién paga). **Solo lectura**: no permitía activarse Pro gratis, no hay grant de `UPDATE`. Misma migración. |
| AUD-04 | `estadisticas_plazos` **no existe en producción** | 🔶 Migración pendiente de aplicar | Alta | La migración `20260712090000_estadisticas_plazos.sql` está en el repo pero la tabla no existe (`to_regclass` → null). Dos rutas la usan: el cron semanal `/api/cron/estadisticas-plazos` (falla en cada ejecución) y `lib/estadisticas.ts`. Es la base de QW-01, EXP-07, DATA-02 y DATA-04. |
| AUD-05 | `lib/estadisticas.ts` descartaba el `error` de Supabase | ✅ Corregido | Media | Hacía indistinguibles "aún no hay muestra" y "la consulta ha reventado": la UI mostraba el mismo vacío en los dos casos, que es justo por lo que AUD-04 pasó desapercibido. Ahora se registra el error y se sigue degradando a `{}`. |
| AUD-06 | `marcar_alerta_aplicada` ejecutable por `anon` pese a existir migración que lo revoca | ✅ Migración escrita | Media | `20260808080208_revocar_execute_marcar_alerta_aplicada.sql` está commiteada, pero los advisors (0028/0029) siguen marcándola el 2026-08-23 → **nunca se aplicó**. Segunda prueba independiente de la deriva repo↔producción. Reafirmado de forma idempotente. |
| AUD-07 | Deriva repo ↔ producción sin detección | ⬜ Pendiente | Alta | Causa común de AUD-04 y AUD-06. Las migraciones se aplican a mano (confirmado: `fase_comercial` se aplicó manualmente el 22-ago). No hay `supabase db push` en CI ni chequeo de drift. Mientras siga así, cualquier migración futura puede quedarse sin aplicar en silencio. |

### Activos construidos y sin usar (verificado con `count(*)`)

No son bugs: es capacidad ya pagada que no está produciendo valor. Con
**1 organización y 43 expedientes**, el producto está en pre-lanzamiento, así
que esto reordena prioridades: el cuello de botella no es tener más
funcionalidades premium, es que las que ya existen no tienen datos dentro.

| Tabla | Filas | Lectura |
|-------|-------|---------|
| `alertas_boe` | **0** | Consecuencia directa de AUD-01. QW-02 (digest semanal) y PREM-08 (impacto retroactivo), construidos en esta sesión, operan sobre una tabla vacía: **no pueden disparar nunca**. |
| `asistente_conversaciones` / `asistente_mensajes` | **0** / **0** | Pero `asistente_uso` tiene 4 filas: el chat **se usa y se contabiliza, pero no se persiste**. `/api/v1/asistente/conversacion` siempre devolverá vacío → el asistente no tiene memoria y no hay bucle de calidad (`asistente_reportes` también a 0). |
| `catalogo_componentes` | **0** | Esquema completo con `coste`, `fuente_url`, `fecha_verificacion`, `nivel_verificacion`: es una base de datos de precios verificados ya diseñada y nunca poblada. El activo latente más valioso del repo (ver DATA-01). |
| `analisis_facturas` / `estudios_energeticos` | **0** / **0** | Subsistema de estudios energéticos con endpoints vivos y llamados desde el frontend, sin una sola fila. |
| `notificaciones` | **0** | El cron diario `/api/cron/notificaciones-plazos` no ha generado nunca una notificación. |
| `documentos_cliente` / `subsanaciones` | **0** / **0** | Portal de cliente y workflow de subsanaciones construidos y sin estrenar. |

---

## 1. Quick wins

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| QW-01 | Plazos reales visibles junto al plazo legal | ✅ Hecho (preexistente) | — | Verificado el 2026-08-21: `EstadisticaRealBadge` en `TramiteCard.tsx` ya muestra "media real: Nd" junto al badge de plazo legal, alimentado por `/api/expedientes/[id]/estadisticas` → `obtenerEstadisticasPlazo()` → tabla `estadisticas_plazos` real, con gate de plan Pro y sin fallback engañoso (sin datos, no muestra nada). Extremo a extremo, ya construido — no había nada que hacer aquí. |
| QW-02 | Radar normativo personalizado por cartera | ✅ Hecho | Bajo | Filtro "Solo relevantes para tu cartera" (activado por defecto) en `/alertas`, más digest semanal por email (cron `radar-normativo`, lunes 7:00 UTC) a los miembros de cada organización con alertas nuevas relevantes. No probado con credenciales reales de Resend/Clerk en este entorno (sin acceso a servicios en vivo) — la lógica de selección de alertas y el HTML del email sí están cubiertos por tests; el envío real queda por confirmar en el primer despliegue. |
| QW-03 | Sello de cobertura verificada en el PDF del plan | ⬜ Pendiente | Bajo | Imprimir `nivel_verificacion`/`huecos_verificacion` en el propio documento descargable, no solo en la UI. |
| QW-04 | Plazos legales como calendario (.ics) | ⬜ Pendiente | Bajo | Feed .ics por organización con los vencimientos ya calculados por `calcularVencimientoHabil`. |
| QW-05 | Indicador de riesgo normativo visible | ✅ Hecho (preexistente) | — | `riesgo_normativo` **ya se muestra** en `RiesgoNormativoBanner` dentro de `PlanTramitacionView.tsx` — verificado en código el 2026-08-21. La segunda sesión de discovery lo listó como "invisible, nadie lo ve"; no era correcto en el momento de la verificación. Queda como posible mejora futura llevarlo también al resumen de la lista de expedientes (hoy solo está en el detalle). |
| QW-06 | Aviso semanal de expedientes parados por email | ⬜ Pendiente | Bajo | El dashboard ya calcula expedientes sin movimiento ≥10 días (`PlazosActivos`); falta el email del lunes. |
| QW-07 | Duplicar expediente | ✅ Hecho | Bajo | Botón "Duplicar" junto a "Eliminar" en el detalle del expediente. Clona el plan de tramitación ya calculado (no reclasifica) y los campos técnicos; vacía cliente/notas y reinicia el progreso a propósito — ver `lib/expedientes.ts::payloadDuplicado`. |
| QW-08 | Filtro "Solo mis tareas" por `tipo_actuacion` | ✅ Hecho (preexistente) | — | Verificado el 2026-08-21: `PlanTramitacionView.tsx` ya separa los trámites en secciones claramente etiquetadas por `contarTramites()` — "N trámites a realizar" (accionables), "N actuación administrativa de oficio" (colapsada por defecto), informativos y de revisión aparte. La confusión que motivaba este quick win ("¿esto lo hago yo o la administración?") ya está resuelta por diseño; un toggle adicional sería redundante. |
| QW-09 | Asignar un trámite a una persona del equipo | ⬜ Pendiente | Medio-bajo | Propiedad por trámite sobre el directorio de organización de Clerk (hasta 5 usuarios en plan Pro). Complementa QW-08: uno filtra por naturaleza del trámite, el otro por responsable. |
| QW-10 | Plantillas de email por cambio de estado de trámite | ⬜ Pendiente | Bajo | Email pre-redactado en lenguaje llano al marcar un trámite como completado, para reenviar al cliente final. |
| QW-11 | Resumen ejecutivo de una página para el cliente final | ⬜ Pendiente | Bajo-medio | Nuevo tipo de documento (`resumen_cliente`): 1 página, sin base legal ni plataformas telemáticas, con logo del instalador. Nuevo template en el generador de documentos (no existe hoy — se confirmó que solo hay plan/checklist/MTD/dossier/presupuesto). |
| QW-12 | Notificaciones de vencimiento con umbral configurable | ⬜ Pendiente | Bajo | Hoy avisa a ≤5 días hábiles fijo. Configurar 1-3 umbrales por organización. |
| QW-13 | Vista Kanban de expedientes por estado | ✅ Hecho | Medio | Construido como parte de PREM-02: toggle Tabla/Kanban en `/expedientes` (`ExpedientesVista.tsx`). |

---

## 2. Funcionalidades premium

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| PREM-01 | Silencio administrativo con siguiente paso legal | 🔶 Parcial | Medio | **Rama `feature/silencio-administrativo`.** Infraestructura completa (schema, detección, banner por expediente, resumen de cartera) construida y con tests — commits `7bad06a` y `8f27c1b`. Pendiente: poblar `silencio_administrativo` con datos reales trámite a trámite (checklist ya generado en `apps/api/motor_normativo/SILENCIO_ADMINISTRATIVO_PENDIENTE.md`, 94 trámites) — requiere revisión normativa humana, no se puede completar sin acceso a la norma real. |
| PREM-02 | Cartera de proyectos / pipeline comercial | 🔶 Parcial (MVP) | Alto | Kanban con fase comercial (prospección → simulación enviada → clasificado → en tramitación → aprobado/rechazado), independiente del estado administrativo. Cambio de fase por selector en cada tarjeta, sin arrastrar y soltar (no había ninguna librería de DnD en el proyecto; añadir una solo para esto no se justificaba). Migración `fase_comercial` con backfill desde `estado`. Falta para ser "cartera de proyectos" completa: notas/tareas por fase, filtros del kanban, y drag-and-drop si el uso real lo pide. |
| PREM-03 | Portal de cliente profesional | ⬜ Pendiente | Medio-alto | Amplía el portal `share_token` ya existente: vista de solo lectura del estado del expediente con cuenta atrás del plazo, autorización de representación firmada digitalmente, confirmación de lectura por hito, chat bidireccional con el instalador. |
| PREM-04 | Comparador de financiación en el simulador | ✅ Hecho | Medio | Préstamo (amortización francesa) y renting junto a la opción de pago al contado, comparados contra el coste de energía mensual actual -- no solo el ahorro anual. TAE/% de renting son horquillas de mercado explícitamente marcadas como no verificadas (`constantes_mercado_fv.json::financiacion`), nunca una oferta real. |
| PREM-05 | Informe de viabilidad descargable con marca del instalador | ✅ Hecho | Medio | PDF de una página con el índice de idoneidad (PVGIS/zona CTE) ya calculado en "Orientación", sin expediente ni clasificación previa. Mismo criterio de embudo que "presupuesto": disponible en todos los planes, con marca de PermitFlow en el plan gratuito y white-label en Pro/Enterprise. Sin idoneidad cuantitativa para IRVE/ACS/gas: el informe lo dice explícitamente en vez de inventar una banda. `documentos/pdf.py::generar_informe_viabilidad_pdf`, `POST /api/v1/documentos/informe-viabilidad`, botón en `IndiceIdoneidad.tsx`. |
| PREM-06 | Vigilancia normativa ampliada + API de cambios | ⬜ Pendiente | Alto | Ampliar el pipeline BOE de 4 a los 17 boletines autonómicos (las fuentes ya están parametrizadas en `boe_pipeline.py`) y exponer un webhook/API premium con cada cambio verificado. |
| PREM-07 | Presupuestación con firma digital del cliente | ⬜ Pendiente | Alto | Extiende el documento `presupuesto` actual: partidas editables, envío por email, seguimiento de estado (enviado/visto/aceptado), firma digital desde el portal de cliente. |
| PREM-08 | Impacto retroactivo de cambios normativos sobre expedientes activos | 🔶 Parcial | Alto | Detección + aviso construidos: `alertaImpactaRetroactivamente()` distingue alerta verificada y aplicada DESPUÉS de crear el expediente (impacto real) de sugerencia de IA sin revisar o cambio ya vigente al crearlo. Banner de dos niveles en el detalle del expediente + resumen agregado en el dashboard. Deliberadamente NO re-clasifica automáticamente ni genera un diff de trámites: `expedientes` no guarda todos los campos de entrada originales (solo un subconjunto, mismo hueco que ya limitó QW-07), así que un diff automático podría ser incorrecto por campos que faltan. Queda como aviso "revisa esto a mano", no un recálculo silencioso. |
| PREM-09 | API programática del clasificador (Enterprise) | ⬜ Pendiente | Alto | El motor ya es un servicio headless (JSON dentro, JSON fuera). Empaquetarlo con API key, quota y documentación OpenAPI para integrarlo en ERPs de terceros. |
| PREM-10 | Módulo de revisiones periódicas obligatorias | ⬜ Pendiente | Medio-alto | Al aprobar un expediente con obligación de inspección periódica (legionella RD 487/2022, OCA, RITE), programar automáticamente el recordatorio de renovación futura. Misma idea que EXP-01 con foco comercial (vender mantenimiento normativo como servicio recurrente). |

---

## 3. Efecto wow

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| WOW-01 | Calendario de tramitación con P50/P90 reales | ⬜ Pendiente | Medio-alto | Evolución de QW-01: calendario interactivo con fechas realistas por percentil (no solo la media), considerando `paralelo_con` y festivos por CCAA. Depende de que `estadisticas_plazos` tenga volumen suficiente. |
| WOW-02 | Simulador de escenarios "¿Qué pasa si cambio X?" | ⬜ Pendiente | Alto | Panel para cambiar parámetros de un expediente (potencia, modalidad, ubicación) y ver al instante el diff del plan de tramitación, aprovechando que el clasificador es determinista y corre en <200ms. |
| WOW-03 | Auditoría pre-presentación automática | ⬜ Pendiente | Alto | Compara `documentos_requeridos` de cada trámite contra lo subido al portal de cliente y calcula un índice de preparación con lo que falta. |
| WOW-04 | Índice de dificultad administrativa por CCAA y tecnología | ⬜ Pendiente | Medio | Número público (lead magnet) combinando nº de trámites, tiempo real medio y estabilidad normativa. |
| WOW-05 | Predicción de riesgo de requerimiento/subsanación | ⬜ Pendiente | Alto | Cruza `huecos_verificacion` con el histórico real de `subsanaciones` (ya existe como tabla) para avisar antes de presentar. El dato de motivo de subsanación estructurado es el que faltaría reforzar primero (ver EXP-05). |
| WOW-06 | Traductor normativo entre comunidades autónomas | ⬜ Pendiente | Medio | Comparador lado a lado del mismo vertical entre dos CCAA, generado directamente de las reglas ya estructuradas. |
| WOW-07 | Redacción automática de alegación o recurso | ⬜ Pendiente | Alto | Depende de PREM-01 (silencio administrativo) y del motor de plantillas ya existente. Evolución natural una vez haya datos reales de `silencio_administrativo`. |
| WOW-08 | Mapa de tiempos reales por organismo | ⬜ Pendiente | Alto | Agregado y anonimizado entre clientes: "este ayuntamiento tarda de media 45 días más que el plazo legal en este trámite". |

---

## 4. Motor normativo

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| MOTOR-01 | UI interna de revisión de borradores BOE | ⬜ Pendiente | Medio | Hoy la revisión de cambios detectados se hace por CLI (`scripts/revisar_borrador.py`) contra un PR de GitHub. Una UI side-by-side reduciría la dependencia de perfil técnico para mantener el motor. |
| MOTOR-02 | Expansión a nuevas verticales | ⬜ Pendiente | Alto | La arquitectura JSON + JSONLogic es agnóstica a la tecnología. Candidatas: almacenamiento con baterías (BESS), recarga en vía pública (concesión municipal), hidrógeno verde, CTE-HE en obra nueva. |
| MOTOR-03 | Repositorio de resoluciones y subsanaciones reales | ⬜ Pendiente | Alto | Conocimiento estructurado (no un foro) de motivos de subsanación frecuentes por organismo, alimentado gradualmente. Requiere antes reforzar el registro estructurado de motivo en `subsanaciones` (ver EXP-05). |

*(La vigilancia ampliada y el impacto retroactivo del motor normativo viven en PREM-06 y PREM-08 respectivamente, para no duplicarlos aquí.)*

---

## 5. Expedientes vivos

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| EXP-01 | El expediente se reabre solo para la siguiente inspección | ⬜ Pendiente | Medio | El dominio de datos ya distingue instalaciones con inspección periódica obligatoria; falta que el expediente aprobado programe su propio recordatorio de renovación. Ver también PREM-10 (mismo mecanismo, ángulo comercial). |
| EXP-02 | Ahorro prometido vs. ahorro real | ⬜ Pendiente | Medio | Repetir la lectura de factura vía Datadis meses después de aprobado el expediente y comparar contra lo que prometió el simulador. |
| EXP-03 | Historial normativo ligado al expediente | ⬜ Pendiente | Medio | Si una alerta de cambio normativo afecta a un expediente ya aprobado, dejar constancia permanente en su historial. Comparte base de datos con PREM-08. |
| EXP-04 | Expediente como historial permanente de la instalación | ⬜ Pendiente | Alto | Modificaciones futuras (ampliación de potencia, cambio de modalidad) como sub-expedientes vinculados al original, con la documentación accesible durante toda la vida útil. Envolvente conceptual de EXP-01. |
| EXP-05 | Workflow completo de subsanaciones | 🔶 Parcial | Medio | La tabla `subsanaciones` **ya existe** (migración `20260808084914_subsanaciones.sql`, con `plazo_dias`/`fecha_limite` calculados) y ya hay un `SubsanacionesPanel.tsx` en frontend — verificado el 2026-08-21, corrige la premisa de "no existe nada de esto" de una de las dos sesiones de discovery. Pendiente de confirmar/reforzar: registro estructurado del *motivo* de la subsanación (hoy no está claro que se capture de forma consultable) y su cierre del círculo con `estadisticas_plazos` al resolverse. |
| EXP-06 | OCR de documentación subida para validación cruzada | ⬜ Pendiente | Alto | Extraer datos clave de documentos subidos al portal (potencia, titular, dirección) y contrastarlos contra el expediente. |
| EXP-07 | Timeline de desviación real vs. estimado | ⬜ Pendiente | Medio | Barra de progreso temporal comparando plazo legal, plazo real (P50/P90) y avance real. Depende de QW-01. |

---

## 6. Datos e inteligencia de negocio

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| DATA-01 | Benchmarking de coste por kWp y CCAA | ⬜ Pendiente | Bajo-medio | Las constantes de mercado que hoy solo alimentan el simulador, convertidas en informe periódico de evolución de costes. |
| DATA-02 | Comparativa de velocidad de tramitación propia vs. sector | ⬜ Pendiente | Medio | "Tu tiempo medio es de 38 días; la media del sector en tu CCAA es 45" — usando `estadisticas_plazos` agregado y anonimizado. |
| DATA-03 | Informe trimestral/sectorial de inteligencia de mercado | ⬜ Pendiente | Medio-alto | Informe automático personalizado por organización (evolución de tiempos, convocatorias nuevas, cambios normativos del trimestre) + versión sectorial pública como contenido de adquisición. |
| DATA-04 | Predictor probabilístico de duración | ⬜ Pendiente | Alto | Pasar de media a distribución (P50/P90) para compromisos contractuales con riesgo calculado. Necesita masa crítica de datos en `estadisticas_plazos` — no antes de 12-18 meses de acumulación real. |
| DATA-05 | Mapa de actividad normativa de España | ⬜ Pendiente | Medio | Visualización pública (lead magnet) del número de cambios normativos por CCAA/vertical en los últimos 12 meses, usando el propio pipeline BOE. |
| DATA-06 | Panel de cartera propia vs. mercado | 🔶 Parcial | Medio | `/estadisticas` ya muestra KPIs, tendencia mensual y distribución por estado de la propia organización (`lib/estadisticas.ts::calcularEstadisticasReales`, con umbral de muestra mínima honesto). Falta la comparativa "tú vs. el sector" — hoy es solo autoanálisis, no benchmarking entre organizaciones. |

---

## Resumen de estado

- ✅ Hecho: 8 (QW-01 plazos reales y QW-05 riesgo normativo visible — preexistentes, corrección de premisa; QW-02 radar normativo por cartera, QW-07 duplicar expediente, QW-08 filtro por tipo de actuación, QW-13 vista kanban, PREM-04 comparador de financiación, PREM-05 informe de viabilidad descargable — construidos en esta sesión)
- 🔶 Parcial: 4 (PREM-01 silencio administrativo, PREM-02 cartera de proyectos/kanban, PREM-08 impacto retroactivo, EXP-05 subsanaciones) + DATA-06 panel de cartera
- ⬜ Pendiente: 28

Última actualización: 2026-08-22. Construido PREM-08 (detección de impacto retroactivo + avisos en dos niveles), sin re-clasificación automática por el hueco de campos de entrada no persistidos -- mismo motivo que limitó QW-07. Nota aparte: se recibió y verificó una auditoría normativa externa de Andalucía cuyos hallazgos más concretos (coste RADNE, referencia F-Gas, "26 reglas muertas", `nivel_verificacion` sin declarar) no se sostuvieron al contrastarlos con los ficheros reales -- no se ha aplicado ningún cambio a partir de ella salvo pendiente de confirmar la cita de RD 178/2021 en `andalucia/acs.json`.
