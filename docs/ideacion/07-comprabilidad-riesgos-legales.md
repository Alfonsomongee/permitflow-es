Actúa como un equipo de investigación de producto y estrategia con capacidad de navegación web profunda. Vas a investigar **un solo eje** para una sesión de ideación sobre un producto real. Sé exhaustivo, crítico y honesto con la incertidumbre: prefiero una lista corta de afirmaciones comprobadas a una larga de afirmaciones plausibles. Responde en español.

## BLOQUE DE CONTEXTO (léelo entero antes de investigar)

Fecha de referencia: octubre de 2026. Usa fuentes actuales y comprueba la vigencia de todo lo que cites.

**Qué es el producto.** PermitFlow ES es un SaaS B2B para España. Dados el tipo de instalación técnica, la comunidad autónoma (CCAA), la potencia, el uso y otros parámetros, devuelve el **plan de tramitación**: los trámites en orden, con organismo, plataforma, base legal, plazo legal y estimado, tasa, documentos requeridos y notas. Después ayuda a gestionar el expediente. El fundador es **una sola persona**, apoyada por asistentes de IA.

**Para quién.** Instaladoras técnicas (1–20 técnicos), gestorías de tramitación e ingenieros freelance. Objetivo a medio plazo: que pueda **adquirirla una gran empresa del sector energético** (distribuidora, comercializadora, fabricante o gran instaladora).

**Verticales (5):** fotovoltaica de autoconsumo, IRVE (recarga de vehículo eléctrico), climatización/aerotermia, ACS y gas de baja presión. **Cobertura:** 17 CCAA × 5 verticales = 85 ficheros de reglas (721 pasos de trámite en total).

**Qué existe hoy (no lo propongas como novedad):**
- *Motor normativo determinista* (JSON por CCAA y vertical, condiciones json-logic, sin IA en la decisión, respuesta en menos de 3 s). Cada fichero lleva nivel de verificación, estado, fuentes, huecos de verificación y revisor.
- *Estado honesto de la normativa:* ningún fichero ha sido revisado por una persona (campo `revisado_por` vacío en los 85). Aproximadamente 61 están como «borrador no verificado» y unos 24 con verificación parcial. Se hizo una verificación automática con fuentes secundarias; casi todas las sedes autonómicas bloquean la lectura automática, así que muchos plazos, silencios administrativos y tasas de 2026 siguen sin confirmar. Hay una lista de 67 fichas pendientes de abrir a mano. La web y cada plan muestran el nivel de verificación al usuario.
- *Pipeline de vigilancia de boletines:* se ejecuta lunes y jueves; lee BOE, BOJA, BOCM y DOGC, detecta normas nuevas con ayuda de un LLM y genera alertas para revisión humana. No aplica cambios solo.
- *App autenticada:* asistente por pasos «nueva instalación» (tipo, comunidad por desplegable, parámetros técnicos, ayudas); lista y detalle de expedientes con estado por trámite, notas, historial, subsanaciones y documentos subidos; portal de cliente final por enlace con token (ve el avance y sube documentos); exportación del plan a PDF, checklist, memoria técnica tipo, dossier y plantillas; validador pre-presentación; presupuesto rápido en PDF; alertas normativas por expediente; notificaciones de plazos; estadísticas con plazos reales agregados; cuota Free y checkout de Stripe para Pro.
- *Simulador de ahorro fotovoltaico:* el usuario sube una factura de luz en PDF o el CSV de consumo horario de Datadis; se extraen potencia contratada, consumo y precios (regex + LLM, con CUPS pseudonimizado); se consulta PVGIS para la producción por ubicación; un **motor financiero determinista** calcula ahorro, coste y payback (el LLM **no** decide ninguna cifra, solo redacta el informe). Las constantes de mercado van marcadas como estimadas y sin verificar.
- *Orientación por tecnología:* fichas de cuándo encaja o no cada tecnología, índice de idoneidad geográfica (geocoding + PVGIS + zonas climáticas del CTE) y bloque fiscal.
- *Catálogo de ayudas e incentivos por CCAA:* investigado a mano en jul–ago 2026, cada entrada con fecha y fiabilidad; **no es un feed vivo**. MOVES III figura como cerrado y su sustituto es el Programa Auto+ (RD 609/2026), que cubre compra de vehículo, no infraestructura.
- *Asistente conversacional* (chat flotante, DeepSeek) con el contexto del expediente abierto y dos herramientas de consulta (estado real de los trámites y ayudas disponibles); permite reportar respuestas erróneas. **No** consulta un corpus normativo propio.
- *Indicador de riesgo normativo:* cualitativo (bajo/medio/alto), basado en la completitud de cada trámite y en el nivel de verificación del fichero. **No** es estadístico ni predice rechazos.
- *Precios hoy:* Free (0 €, 5 clasificaciones/mes, sin documentos descargables ni validador) y Pro (49 €/mes por empresa); Enterprise «a consultar». El documento fundacional planteaba 79/149/299 €. Está sin decidir. No hay facturación anual.

**Qué NO existe (huecos reales):**
- Verificación humana de la normativa y un sistema de revisión continua con responsable.
- Variables del clasificador que casi todas las CCAA necesitan: autoconsumo con o sin excedentes, registro de IRVE de acceso público, clase de instalación de gas (comunes, acometidas de más de 2.000 kW, ampliaciones de ≥ 30 %).
- **Presentación automática ante las sedes:** no hay ninguna integración; el usuario presenta él. Tampoco se rellenan los modelos oficiales de cada CCAA (hay plantillas y memorias tipo, no los formularios oficiales rellenos).
- **Base de conocimiento indexada y buscable (RAG) con citas** a la norma.
- Histórico de rechazos con su motivo: no hay datos para un scoring predictivo.
- Integraciones con ERP/CRM de instaladoras, con distribuidoras (e-distribución, i-DE, etc.), con firma electrónica o con el portal de ayudas.
- Análisis de oferta o presupuesto, comparador de ofertas, baterías, tarifas eléctricas y optimización de contrato, autoconsumo colectivo y comunidades energéticas modelados a fondo.
- Aplicación móvil o modo obra. Autocompletado de dirección en el formulario (el backend usa Geocoding solo para la orientación).

**Restricciones y principios (no negociables al proponer ideas):**
1. **La veracidad es el producto.** Un plazo, tasa o cifra inventados destruyen la confianza y exponen a responsabilidad. Toda idea debe decir de dónde sale cada dato y cómo se mantiene al día. Lo que no se pueda verificar se muestra como tal; no se rellena con lo «habitual».
2. **Cálculos deterministas y auditables.** El LLM redacta, resume y busca; no calcula ni decide.
3. **RGPD:** facturas, CUPS y consumos son datos personales. Minimización, pseudonimización del CUPS, consentimiento, retención limitada.
4. **Equipo de una persona.** Todo debe ser mantenible por muy pocas personas. Penaliza las ideas que exigen operaciones manuales continuas o un equipo comercial grande.
5. **Stack cerrado:** Next.js 15 + FastAPI (Python) + PostgreSQL en Supabase + Clerk + Stripe + Redis; IA con DeepSeek, con el cliente preparado para migrar a Claude. No propongas cambiar de stack. Sí puedes proponer servicios externos concretos si justificas la alternativa.
6. Las normas y plataformas de tramitación cambian cada pocos meses y las sedes bloquean el scraping.

**Objetivo de esta investigación.** Alimentar una sesión de ideación para encontrar las ideas que **multiplicarían por 100 la calidad y la utilidad** del producto, tanto para instaladoras y gestorías como para un posible **comprador estratégico** del sector energético. Aquí investigas **un solo eje** (descrito más abajo). Los demás ejes se investigan en otras sesiones: si una idea cae claramente en otro eje, menciónala en una línea y no la desarrolles.

---

# EJE 7 — Qué haría comprable la empresa y riesgos legales

## TU MISIÓN EN ESTE EJE
Investiga **qué convertiría este producto en un activo atractivo para un comprador estratégico del sector energético** (distribuidoras, comercializadoras, fabricantes de equipos, grandes instaladoras, ingenierías, aseguradoras, plataformas de software energético) y **qué riesgos legales y de responsabilidad hay que gestionar desde ya** para que una auditoría de compra (due diligence) no los descubra tarde. El objetivo es construir con deliberación el valor adquirible, no solo crecer.

## PREGUNTAS A RESOLVER
### A. Comprabilidad
1. **Transacciones comparables reales** de software vertical energético, de «construction tech»/permitting tech y de legaltech/regtech de nicho (2018–2026): comprador, objetivo, año, importe y múltiplos si son públicos (con fuente), motivación declarada y qué activo se pagó (datos, equipo, cuota de mercado, tecnología, licencias). Incluye el análogo estadounidense de permisos y las adquisiciones de plataformas de software para instaladoras solares; distingue entre adquisiciones y *acqui-hires*. Descarta el humo: indica cuando solo hay rumor.
2. **Perfil por tipo de comprador:** para cada uno (distribuidora, comercializadora, fabricante, gran instaladora, ingeniería, aseguradora, software de gestión del sector, consultora, plataforma de datos energéticos), qué problema suyo resuelve este producto, qué activos le interesarían y cuáles no, quién decide dentro de la empresa, cómo suelen sourcear (corporate venturing, programas de startups, M&A) y ejemplos concretos de programas abiertos a startups en España (listas de corporate venture y de «open innovation» con enlace).
3. **Qué mira una due diligence técnica y legal** en una compra de software pequeño: propiedad intelectual y licencias de código abierto, titularidad del código escrito con asistentes de IA, contratos con clientes y proveedores, protección de datos (registro de tratamientos, DPAs, transferencias internacionales), seguridad (pentest, cumplimiento de ENS o ISO 27001 si el comprador lo pide), dependencia de un solo desarrollador (*bus factor*), calidad y documentación del código, métricas SaaS (MRR, retención neta, cohortes), y la «lista de verificación» típica que usan los compradores.
4. **Métricas y activos que suben el valor:** cuáles pesan en la valoración de SaaS vertical pequeño (retención, ARR, crecimiento, concentración de clientes, ratio de datos propietarios, integración con el comprador). Qué evidencia existe de rangos de múltiplos para SaaS pequeño en Europa (con fuente y fecha) y de cómo cambia con la dependencia del fundador.
5. **Estructuras alternativas a la venta total:** licencia de marca blanca, integración como módulo del comprador, inversión estratégica minoritaria, *earn-out*, API vendida al sector. Cuándo conviene cada una a un fundador único.
6. **Qué activo diferencial construir para el comprador**: normativa verificada con trazabilidad (eje 5), conjunto de datos con derechos claros (eje 3), integraciones con presentación (eje 4), cartera de clientes con retención. Prioriza qué construir primero si el objetivo es una venta en 24–36 meses.

### B. Riesgos legales (análisis, no asesoramiento; indica dónde hace falta un abogado)
1. **Responsabilidad por información errónea** (civil contractual y extracontractual, Ley General para la Defensa de los Consumidores y Usuarios si hay consumidores, responsabilidad del profesional), cláusulas de limitación y su validez en España, y seguros (RC profesional, ciberriesgo).
2. **Intrusismo y asesoramiento regulado:** ¿cuándo un software que dice qué trámites hay que hacer invade competencias reservadas (ingeniería, gestoría administrativa, asesoramiento jurídico)? Precedentes y límites de la redacción comercial.
3. **RGPD y LOPDGDD:** roles (responsable/encargado) respecto a los datos de clientes finales de las instaladoras, base jurídica, DPA, evaluación de impacto, conservación, derechos de los interesados, notificación de brechas, proveedores de IA (DeepSeek en particular: país de alojamiento, transferencias, política de retención y la posición de autoridades europeas; alternativa de proveedores con tratamiento en la UE). Estado actual de las acciones de autoridades sobre DeepSeek en la UE, con fuentes.
4. **Reglamento europeo de IA:** clasificación probable del producto y obligaciones (transparencia, alfabetización, etiquetado de contenidos generados) con calendario de aplicación vigente a octubre de 2026 (tras cualquier aplazamiento o simplificación aprobada: verifica el estado actual).
5. **Propiedad intelectual y reutilización de fuentes:** normas y formularios oficiales (reutilización de información pública), contenido de asociaciones o de normas UNE (de pago y con derechos), bases de datos propias de terceros, términos de uso de PVGIS, Datadis, Google (Geocoding/Places: reglas de almacenamiento y de caché), REE/ESIOS y similares.
6. **Comercio electrónico y consumo:** LSSI-CE, información precontractual, cláusulas abusivas en B2B con microempresas (que a veces reciben tratamiento próximo al consumidor), renovación automática, facturación electrónica obligatoria (Ley Crea y Crece y su calendario) y VeriFactu, y obligaciones fiscales (IVA en suscripciones UE).
7. **Publicidad comparativa y conflictos de interés** si el producto compara tarifas, equipos o instaladoras o cobra comisión por derivar clientes.
8. **Ciberseguridad:** NIS2 y su transposición en España (¿aplica a un proveedor de software de este tamaño o como proveedor de un comprador regulado?), ENS, buenas prácticas mínimas y su coste.
9. **Sociedad y gobierno:** forma jurídica adecuada para una futura venta, propiedad del software si el fundador lo desarrolló antes de constituir la sociedad, acuerdos con colaboradores/revisores, pacto de socios si entra capital, y trámites fiscales de una venta (a nivel orientativo).
10. **Matriz de riesgos:** probabilidad × impacto × coste de mitigación, con los 10 riesgos más graves y una mitigación mínima concreta para cada uno.

## FUERA DE ALCANCE (lo cubren otros ejes)
El detalle de captura y explotación de datos (eje 3), los mecanismos de verificación (eje 5), los canales de venta (eje 6) y la automatización de la presentación (eje 4): aquí solo interesa cómo cada uno afecta a la comprabilidad y al riesgo.

---

## REGLAS DE EVIDENCIA

- **Prohibido inventar cifras.** Cada dato numérico (tamaño de mercado, precios, tasas de conversión, costes, plazos, multas) debe llevar fuente con enlace y fecha. Si no hay fuente fiable, escribe «sin dato» en lugar de estimar. Si haces una estimación propia, márcala como tal, muestra el cálculo y sus supuestos.
- Distingue fuente **primaria** (BOE, sedes oficiales, informes de organismos, documentación oficial de APIs, sentencias) de fuente secundaria (prensa, blogs, webs comerciales). Prefiere las primarias y di cuál es cada una.
- Aporta **ejemplos reales de productos o empresas comparables**, en España y fuera, con enlace: qué hacen, en qué fase están, qué funcionó y qué fracasó o se abandonó, y por qué. Los fracasos importan tanto como los éxitos.
- Para cada afirmación que dependa de normativa, di qué norma y artículo, y si está vigente en octubre de 2026.
- Si una fuente está tras un muro de pago, bloqueada o no la pudiste abrir, dilo; no la cites como leída.
- Separa explícitamente **hechos comprobados**, **inferencias tuyas** y **supuestos a verificar**.

## FORMATO DE SALIDA (obligatorio, igual en todos los ejes para poder compararlos)

1. **Resumen ejecutivo** (máximo 10 líneas): la tesis del eje y las 3 ideas más prometedoras.
2. **Panorama y comparables:** tabla con producto/empresa, país, qué hace, modelo de negocio, estado actual, enlace, qué enseña para este producto.
3. **Catálogo de ideas** (entre 12 y 20), una fila por idea con estos campos exactos:
   - `id` (corto y estable) · `idea` (una frase) · `problema_que_resuelve` · `para_quien` (instaladora / gestoría / comprador estratégico / cliente final)
   - `por_que_10x_o_100x` (el mecanismo concreto, no un adjetivo)
   - `datos_o_integraciones_necesarios` (con su fuente y si hoy son accesibles)
   - `esfuerzo_equipo_minimo` (S ≤ 2 semanas · M ≤ 2 meses · L > 2 meses, para una persona con asistentes de IA) y qué lo hace caro
   - `riesgos_legales_y_de_veracidad` (RGPD, responsabilidad profesional, propiedad intelectual de las fuentes, términos de uso de las sedes, posibles alucinaciones)
   - `como_se_mide_el_exito` (métrica, umbral y plazo)
   - `comparables` (con enlace)
   - `impacto_1_a_5` y `viabilidad_1_a_5` (con una línea de justificación cada una)
   - `confianza_en_la_evidencia` (alta / media / baja)
4. **Ranking de las 5 mejores ideas del eje**, ordenadas, con la razón de cada posición y el primer experimento barato (menos de 2 semanas) para validarla.
5. **Ideas descartadas** y por qué (al menos 3).
6. **Dependencias y choques** con otros ejes del producto (una línea por cada uno).
7. **Lo que no sé o no pude verificar:** lista explícita de preguntas abiertas, datos que faltan y qué persona o fuente los resolvería.
8. **Anexo:** lista numerada de todas las fuentes con enlace, fecha de consulta y tipo (primaria/secundaria).

Entrega además, al final, el catálogo del punto 3 como un **bloque JSON** (array de objetos con los mismos campos) para poder fusionarlo con los de otros ejes.
