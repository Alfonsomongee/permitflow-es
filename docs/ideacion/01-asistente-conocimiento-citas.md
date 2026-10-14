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

# EJE 1 — Asistente con conocimiento indexado y citas verificables

## TU MISIÓN EN ESTE EJE
Investiga cómo sería un **asistente de tramitación con base de conocimiento propia, buscable y citada**, que un instalador o gestor pueda usar con confianza profesional, y qué lo haría 100 veces más útil que preguntar a un chatbot genérico o buscar en la web de la sede. Hoy el asistente existente no consulta ningún corpus normativo: solo ve el expediente abierto y dos herramientas.

## PREGUNTAS A RESOLVER
1. **Corpus:** ¿qué debería indexarse (BOE consolidado, boletines autonómicos, ITC-BT, RITE, guías técnicas del MITECO/IDAE, instrucciones y FAQs de las sedes, criterios de las distribuidoras, ordenanzas municipales, guías de asociaciones, consultas vinculantes, sentencias, el propio histórico de expedientes)? Para cada fuente: formato, licencia y condiciones de reutilización (Ley 37/2007 de reutilización de la información del sector público, avisos legales de cada sede), si hay API o descarga masiva, frecuencia de cambio y coste de mantenerla al día. Distingue qué es de dominio público de lo que no se puede indexar ni redistribuir.
2. **Arquitectura de recuperación fiable** para un dominio legal en español: troceado por estructura jurídica (artículo/apartado/versión vigente), manejo de **normas consolidadas y vigencia temporal** («¿qué decía el artículo X a fecha Y?»), derogaciones y modificaciones, búsqueda híbrida (léxica + vectorial), reordenación, modelos de embeddings con buen rendimiento en español jurídico. Qué hacen en la práctica los productos de legaltech de referencia (España y fuera) y qué benchmarks públicos existen para evaluar RAG jurídico en español.
3. **Citas que se pueden comprobar:** cita con enlace al artículo exacto y a la versión consolidada, extracto literal visible, fecha de consulta y estado de vigencia. Cómo se **verifica automáticamente** que la cita existe y que respalda la frase (comprobación de entailment/atribución, rechazo si no hay soporte). Cómo se comporta el sistema cuando **no hay fuente**: negarse, escalar a un humano o responder «no verificado».
4. **Evaluación y regresión:** cómo construir un banco de preguntas reales de instaladores con respuesta de referencia, métricas (exactitud de la cita, tasa de alucinación, abstención correcta) y un proceso de mejora continua que lo mantenga una persona.
5. **Cruce con el resto del producto:** el asistente que no solo responde, sino que **explica el plan de un expediente concreto** («por qué este trámite, qué pasaría si subo de 10 a 12 kW»), propone la siguiente acción, redacta el escrito de subsanación o la contestación a un requerimiento citando la norma, y detecta contradicciones entre el plan y lo que dice la norma consolidada.
6. **Modos de uso 100x:** consulta por voz en obra, respuesta por WhatsApp/correo, resumen semanal de lo que cambió para los expedientes abiertos, asistente para el cliente final en el portal. Evalúa cuáles tienen evidencia real de uso.
7. **Responsabilidad:** qué ha pasado cuando asistentes de IA jurídicos han dado respuestas erróneas con consecuencias (casos documentados, sanciones, demandas), y qué descargos, diseño de producto y seguros se usan para reducir el riesgo. Qué exige el Reglamento europeo de IA a un sistema así, según su clasificación probable.
8. **Coste y operación:** orden de magnitud de coste por consulta con modelos actuales (cita precios oficiales con fecha), latencia aceptable y qué parte puede ser una búsqueda sin generación (solo mostrar el artículo), que es más barata y más segura.

## FUERA DE ALCANCE (lo cubren otros ejes)
La verificación humana y el mantenimiento continuo de los JSON de reglas (eje 5), la presentación telemática (eje 4), el modelo de negocio (eje 6) y los cálculos de ahorro (eje 2).

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
