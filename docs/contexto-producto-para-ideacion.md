# PermitFlow ES — contexto del producto para ideación (2026-10-14)

Documento para poner en contexto a otra sesión (o a una herramienta de investigación profunda) antes de generar ideas. Describe lo que **existe de verdad** hoy, lo que **no**, las restricciones y el objetivo. Complementa `AGENTS.md` y `docs/foundation.md`.

---

## 1. Qué es

SaaS B2B para España. Dado el tipo de instalación técnica, la comunidad autónoma, la potencia, el uso y otros parámetros, devuelve el **plan de tramitación**: trámites en orden, organismo, plataforma, base legal, plazo legal y estimado, tasa, documentos requeridos y notas. Después ayuda a gestionar el expediente.

- **Cliente objetivo:** instaladoras técnicas (1–20 técnicos), gestorías de tramitación, ingenieros freelance.
- **Verticales (5):** fotovoltaica de autoconsumo, IRVE (recarga de vehículo eléctrico), climatización/aerotermia, ACS, gas baja presión.
- **Cobertura:** 17 comunidades autónomas × 5 verticales = 85 ficheros de reglas, 721 pasos de trámite.
- **Objetivo a medio plazo:** ser adquirible por una gran empresa del sector energético (distribuidora, comercializadora, fabricante, gran instaladora).
- **Precios hoy en la web:** Free (0 €, con límite mensual de clasificaciones, sin documentos descargables ni validador) y Pro (49 €/mes). El fundacional planteaba 79/149/299 €. Pendiente decidir.

## 2. Stack (decisiones cerradas)

Next.js 15 (App Router) + React 19 + TypeScript estricto + Tailwind/shadcn · FastAPI (Python 3.11) · PostgreSQL en Supabase (RLS multi-tenant) · SQLAlchemy 2 + Alembic · Clerk (auth, multi-tenant) · Stripe · IA: DeepSeek (`deepseek-chat`) con cliente preparado para migrar a Claude · Google Geocoding/Places · pypdf + reportlab · Resend · Vercel + Railway · Sentry + PostHog · GitHub Actions.

## 3. Qué existe hoy (funcionalidades reales)

**Motor normativo (núcleo)**
- Reglas en JSON por comunidad y vertical, con condiciones json-logic y trámites ordenados. Clasificación determinista (sin IA) en menos de 3 s.
- Cada fichero lleva `nivel_verificacion`, `estado`, `fuentes`, `huecos_verificacion` y `revisado_por`.
- **Estado honesto:** 0 ficheros verificados por una persona; 20 parciales y 65 en borrador. Se hizo una verificación automática en tres rondas contra fuentes oficiales, pero casi todas las sedes autonómicas bloquean la lectura automática, así que muchos plazos, silencios y tasas de 2026 siguen sin confirmar. Hay una lista de 67 fichas por abrir a mano (`docs/normativa/fichas-abrir-a-mano.md`).
- Casos de referencia con trámites y días esperados; 1.800+ tests de backend y 190+ de frontend.
- Pipeline semanal de **vigilancia del BOE** (y BOJA, BOCM, DOGC) que detecta normas nuevas y genera alertas para revisión.

**Flujo de trabajo del usuario (app autenticada)**
- *Nueva instalación:* formulario por pasos (tipo, ubicación con autocompletado, parámetros técnicos, ayudas) que genera el expediente y guarda el payload completo de la clasificación.
- *Expedientes:* lista, detalle con plan de tramitación, estado por trámite, notas, historial, subsanaciones, documentos subidos, exportación a PDF.
- *Portal del cliente final:* enlace por token donde el cliente de la instaladora ve el avance y sube documentos.
- *Documentos:* generación de plan, checklist, memoria técnica tipo y dossier; plantillas descargables; validador pre-presentación.
- *Alertas:* cambios normativos relevantes por expediente; campana de notificaciones; plazos activos.
- *Estadísticas:* plazos reales agregados por trámite y KPIs.
- *Cuota Free* aplicada; checkout Stripe para Pro.

**Herramientas de análisis y orientación**
- **Simulador de ahorro/rentabilidad fotovoltaica:** sube una **factura de luz** (PDF) o el **CSV de consumo horario de Datadis**; extrae potencia contratada, consumo y precios; consulta **PVGIS** para la producción por ubicación; calcula con un **motor financiero determinista** (ahorro, coste, payback; el LLM no decide ninguna cifra) y redacta un informe. Constantes de mercado marcadas como estimadas.
- **Orientación por tecnología:** fichas de cuándo encaja cada tecnología y cuándo no; **índice de idoneidad geográfica** (geocoding + PVGIS + zonas climáticas CTE, con caché); bloque fiscal.
- **Catálogo de ayudas e incentivos** por comunidad (investigado a mano en jul–ago 2026, cada entrada con fecha y fiabilidad; no es un feed vivo). MOVES III y similares figuran como cerrados.
- **Asistente conversacional** (chat flotante, DeepSeek) con contexto del expediente abierto y herramientas de consulta (estado real de los trámites); permite reportar respuestas erróneas.
- Paleta de comandos, analítica (PostHog), páginas legales y de marketing, comparativa de cobertura normativa por comunidad.

## 4. Qué NO existe (huecos reales)

- Verificación humana de la normativa y un sistema de revisión continua con responsable.
- Variables del clasificador que casi todas las comunidades necesitan: autoconsumo con/sin excedentes, registro de IRVE de acceso público, clase de instalación de gas (comunes y acometidas > 2.000 kW, ampliaciones ≥ 30 %).
- Presentación automática ante las sedes (no hay integración con ninguna sede; el usuario presenta él).
- Rellenado automático de los formularios oficiales de cada comunidad (hay plantillas y memorias tipo, no los modelos oficiales rellenos).
- Base de conocimiento indexada y buscable (RAG) con citas a la norma; el asistente no consulta un corpus normativo propio.
- Histórico de rechazos con su motivo (no hay datos para un scoring predictivo; el indicador de riesgo actual es normativo, no estadístico).
- Integraciones con ERP/CRM de instaladoras, con distribuidoras (e-distribución, etc.), con firma electrónica o con el portal de ayudas.
- Análisis de oferta/presupuesto, comparador de ofertas, almacenamiento (baterías), tarifas eléctricas y optimización de contrato, autoconsumo colectivo y comunidades energéticas modelados a fondo.
- Aplicación móvil / modo obra.

## 5. Restricciones y principios

- **La veracidad es el producto.** Una cifra o un plazo inventados destruyen la confianza y exponen a responsabilidad. Cualquier idea nueva debe decir de dónde sale cada dato y cómo se mantiene al día. Lo que no se puede verificar se muestra como tal, no se rellena con lo «habitual».
- Cálculos económicos deterministas y auditables; el LLM redacta, no calcula.
- Datos personales (facturas, CUPS, consumos) bajo RGPD: minimización, hash de CUPS, consentimiento, retención limitada.
- Equipo pequeño: una persona fundadora, apoyada por asistentes de IA. Todo debe ser mantenible por muy pocas personas.
- Stack cerrado (no cambiar sin consultar); migraciones Alembic para cualquier cambio de esquema.
- Normativa y plataformas cambian cada pocos meses; las sedes bloquean scraping.

## 6. Qué se quiere ahora

Una sesión de **ideación profunda** para encontrar las mejores ideas que **multipliquen por 100 la calidad y la utilidad** de la herramienta para instaladoras, gestorías y, a la vez, aumenten su valor para un comprador estratégico del sector energético. Ejemplos de semillas dadas por el fundador (no limitantes):

- Bot con información indexada (corpus normativo, fichas, guías, histórico) que responda con cita.
- Cálculo de ahorro al instalar cierta tecnología (ya existe para fotovoltaica; ¿extender a aerotermia, baterías, IRVE, gas→electrificación?).
- Análisis de factura de luz (ya existe una primera versión; ¿qué sería la versión 100x?: optimización de tarifa y potencia, detección de errores de facturación, simulación de autoconsumo colectivo…).

Se pide pensar también en: ventaja de datos acumulativa (foso), automatización de la presentación, calidad y confianza de la normativa, distribución y canales, monetización, riesgos legales y lo que haría atractiva la compra por una gran empresa.

## 7. Dónde mirar en el repositorio

`AGENTS.md` (convenciones y estado) · `docs/foundation.md` (visión, mercado, modelo) · `docs/normativa/verificacion-2026-10-01.md` (estado real de la normativa) · `docs/decisiones/` (ADR 0001–0008) · `apps/api/motor_normativo/reglas/` · `apps/api/servicios/` (simulador, ayudas, asistente, PVGIS, Datadis) · `apps/web/app/` (páginas) · rama de trabajo `claude/festive-euler-xs09qt`.
