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

## 1. Quick wins

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| QW-01 | Plazos reales visibles junto al plazo legal | ✅ Hecho (preexistente) | — | Verificado el 2026-08-21: `EstadisticaRealBadge` en `TramiteCard.tsx` ya muestra "media real: Nd" junto al badge de plazo legal, alimentado por `/api/expedientes/[id]/estadisticas` → `obtenerEstadisticasPlazo()` → tabla `estadisticas_plazos` real, con gate de plan Pro y sin fallback engañoso (sin datos, no muestra nada). Extremo a extremo, ya construido — no había nada que hacer aquí. |
| QW-02 | Radar normativo personalizado por cartera | ✅ Hecho | Bajo | Filtro "Solo relevantes para tu cartera" (activado por defecto) en `/alertas`, más digest semanal por email (cron `radar-normativo`, lunes 7:00 UTC) a los miembros de cada organización con alertas nuevas relevantes. No probado con credenciales reales de Resend/Clerk en este entorno (sin acceso a servicios en vivo) — la lógica de selección de alertas y el HTML del email sí están cubiertos por tests; el envío real queda por confirmar en el primer despliegue. |
| QW-03 | Sello de cobertura verificada en el PDF del plan | ⬜ Pendiente | Bajo | Imprimir `nivel_verificacion`/`huecos_verificacion` en el propio documento descargable, no solo en la UI. |
| QW-04 | Plazos legales como calendario (.ics) | ⬜ Pendiente | Bajo | Feed .ics por organización con los vencimientos ya calculados por `calcularVencimientoHabil`. |
| QW-05 | Indicador de riesgo normativo visible | ✅ Hecho (preexistente) | — | `riesgo_normativo` **ya se muestra** en `RiesgoNormativoBanner` dentro de `PlanTramitacionView.tsx` — verificado en código el 2026-08-21. La segunda sesión de discovery lo listó como "invisible, nadie lo ve"; no era correcto en el momento de la verificación. Queda como posible mejora futura llevarlo también al resumen de la lista de expedientes (hoy solo está en el detalle). |
| QW-06 | Aviso semanal de expedientes parados por email | ⬜ Pendiente | Bajo | El dashboard ya calcula expedientes sin movimiento ≥10 días (`PlazosActivos`); falta el email del lunes. |
| QW-07 | Duplicar expediente | ⬜ Pendiente | Bajo | Clonar un expediente ya clasificado para proyectos repetidos (misma CCAA/potencia, distinta dirección/cliente). |
| QW-08 | Filtro "Solo mis tareas" por `tipo_actuacion` | ⬜ Pendiente | Bajo | Toggle que filtra trámites por `accion_usuario` frente a `oficio_administracion`/`informativa`. El campo ya existe en el modelo, no se usa en la UI. |
| QW-09 | Asignar un trámite a una persona del equipo | ⬜ Pendiente | Medio-bajo | Propiedad por trámite sobre el directorio de organización de Clerk (hasta 5 usuarios en plan Pro). Complementa QW-08: uno filtra por naturaleza del trámite, el otro por responsable. |
| QW-10 | Plantillas de email por cambio de estado de trámite | ⬜ Pendiente | Bajo | Email pre-redactado en lenguaje llano al marcar un trámite como completado, para reenviar al cliente final. |
| QW-11 | Resumen ejecutivo de una página para el cliente final | ⬜ Pendiente | Bajo-medio | Nuevo tipo de documento (`resumen_cliente`): 1 página, sin base legal ni plataformas telemáticas, con logo del instalador. Nuevo template en el generador de documentos (no existe hoy — se confirmó que solo hay plan/checklist/MTD/dossier/presupuesto). |
| QW-12 | Notificaciones de vencimiento con umbral configurable | ⬜ Pendiente | Bajo | Hoy avisa a ≤5 días hábiles fijo. Configurar 1-3 umbrales por organización. |
| QW-13 | Vista Kanban de expedientes por estado | ⬜ Pendiente | Medio | Alternativa a la tabla actual, columnas por fase operativa. Primer paso hacia PREM-02 (cartera de proyectos completa). |

---

## 2. Funcionalidades premium

| ID | Nombre | Estado | Esfuerzo | Descripción |
|---|---|---|---|---|
| PREM-01 | Silencio administrativo con siguiente paso legal | 🔶 Parcial | Medio | **Rama `feature/silencio-administrativo`.** Infraestructura completa (schema, detección, banner por expediente, resumen de cartera) construida y con tests — commits `7bad06a` y `8f27c1b`. Pendiente: poblar `silencio_administrativo` con datos reales trámite a trámite (checklist ya generado en `apps/api/motor_normativo/SILENCIO_ADMINISTRATIVO_PENDIENTE.md`, 94 trámites) — requiere revisión normativa humana, no se puede completar sin acceso a la norma real. |
| PREM-02 | Cartera de proyectos / pipeline comercial | ⬜ Pendiente | Alto | Vista tipo kanban con fase comercial (prospección → simulación → clasificado → tramitación → aprobado) sobre los expedientes existentes. Elimina la necesidad de un CRM aparte para muchas instaladoras. |
| PREM-03 | Portal de cliente profesional | ⬜ Pendiente | Medio-alto | Amplía el portal `share_token` ya existente: vista de solo lectura del estado del expediente con cuenta atrás del plazo, autorización de representación firmada digitalmente, confirmación de lectura por hito, chat bidireccional con el instalador. |
| PREM-04 | Comparador de financiación en el simulador | ⬜ Pendiente | Medio | Leasing / préstamo verde / renting energético junto a la opción de pago al contado que ya existe, sobre los mismos datos de consumo e inversión ya extraídos. |
| PREM-05 | Informe de viabilidad descargable con marca del instalador | ⬜ Pendiente | Medio | PDF de marca blanca a partir del resultado de "Orientación"/idoneidad, para usar como material de venta antes de comprometerse a un proyecto. |
| PREM-06 | Vigilancia normativa ampliada + API de cambios | ⬜ Pendiente | Alto | Ampliar el pipeline BOE de 4 a los 17 boletines autonómicos (las fuentes ya están parametrizadas en `boe_pipeline.py`) y exponer un webhook/API premium con cada cambio verificado. |
| PREM-07 | Presupuestación con firma digital del cliente | ⬜ Pendiente | Alto | Extiende el documento `presupuesto` actual: partidas editables, envío por email, seguimiento de estado (enviado/visto/aceptado), firma digital desde el portal de cliente. |
| PREM-08 | Impacto retroactivo de cambios normativos sobre expedientes activos | ⬜ Pendiente | Alto | Cuando el pipeline BOE detecta y verifica un cambio, re-evaluar automáticamente los expedientes activos afectados y generar la acción recomendada por expediente. El embrión ya existe: `AlertasBoeList.tsx` ya muestra expedientes "afectados" por alerta. |
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

- ✅ Hecho: 3 (QW-01 plazos reales y QW-05 riesgo normativo visible — preexistentes, corrección de premisa; QW-02 radar normativo por cartera — construido en esta sesión)
- 🔶 Parcial: 3 (PREM-01 silencio administrativo, EXP-05 subsanaciones, DATA-06 panel de cartera)
- ⬜ Pendiente: 35

Última actualización: 2026-08-21. QW-01 resultó ya construido al verificarlo. QW-02 (filtro de alertas por cartera + digest semanal por email) construido y con tests; pendiente de verificar el envío real de email en el primer despliegue con credenciales de Resend/Clerk en vivo.
