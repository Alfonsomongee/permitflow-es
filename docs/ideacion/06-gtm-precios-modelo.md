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

# EJE 6 — Go-to-market, canales, precios y modelo de negocio

## TU MISIÓN EN ESTE EJE
Investiga cómo **llegar a las instaladoras y gestorías españolas, convencerlas de pagar y retenerlas**, con una persona al frente y sin presupuesto grande, y cuál es el **modelo de monetización** que maximiza ingresos recurrentes y valor estratégico. Hoy hay dos planes (Free: 5 clasificaciones al mes; Pro: 49 €/mes por empresa) y un Enterprise a consultar; el documento fundacional planteaba 79 / 149 / 299 €; no hay facturación anual; no hay datos reales de conversión ni de retención.

## PREGUNTAS A RESOLVER
1. **Segmentación y tamaño del mercado, con cifras comprobables:** nº de empresas instaladoras habilitadas por vertical (registros del ministerio y de las CCAA, RAIPEE, CNAE y datos del INE/DIRCE), cuántas gestorías técnicas, ingenierías pequeñas y freelance, tamaños medios, volumen de instalaciones anuales (autoconsumo, IRVE, aerotermia, gas; datos de UNEF, APPA, ANFAC, AFEC, Fenie/Conaif, IDAE, Ministerio). Contrasta las cifras del documento fundacional (25.000 instaladoras, 2.000–3.000 gestorías técnicas, 3 M€/mes de TAM) con las fuentes y corrígelas si no se sostienen.
2. **Adquisición:** canales con evidencia para vender software a pequeños oficios técnicos en España: asociaciones (CONAIF, FENIE, AGREMIA, asociaciones provinciales, clústeres), colegios profesionales, distribuidores y mayoristas de material eléctrico y de climatización (Rexel, Sonepar, Saltoki, Cofac, Salvador Escoda), fabricantes (programas para instaladores de Daikin, Vaillant, Viessmann, Huawei, SMA, Fronius, etc.), ferias (Genera, Climatización y Refrigeración, Matelec), formación y webinars, SEO por trámite y CCAA, vídeos, comunidades de WhatsApp/Telegram/foros de instaladores. Para cada canal: coste de adquisición reportado, ciclo de venta y ejemplos de SaaS verticales que lo usaron con éxito.
3. **Distribución mediante terceros (la palanca más barata):** acuerdos de reventa o de marca blanca con distribuidores, fabricantes, asociaciones o software de gestión; qué comisión suelen pedir y qué poder de negociación tiene un producto pequeño. Programas de embajadores o de gestorías como prescriptoras.
4. **Producto como canal:** contenido útil gratuito que capta demanda (calculadoras, el simulador, el presupuesto rápido, el clasificador de muestra, la guía por CCAA), cuánta fricción tolera un instalador antes de registrarse, y qué evidencia hay de que un «lead magnet» técnico convierte en este tipo de cliente. Qué hacer con el cliente final (propietario) como canal: referirlo a instaladoras (marketplace) frente al riesgo de conflicto con el cliente.
5. **Modelo de precios:** compara por valor (por expediente, por usuario, por sede, por ahorro, por volumen de trámites) frente a por suscripción plana; tramos, límites del plan gratuito, prueba de pago frente a gratuita, facturación anual y descuento, cobro por SEPA frente a tarjeta, y modelos híbridos (suscripción + pago por documento presentado o por informe). Aporta **benchmarks reales** de precios de software vertical para instaladoras, ingeniería y gestoría en España (con enlaces a las páginas públicas de precios) y de SaaS verticales B2B de pyme en la UE.
6. **Elasticidad y disposición a pagar:** metodología barata y fiable para medirla con 20–30 entrevistas (Van Westendorp, Gabor-Granger, conjoint ligero) y plantilla de guion. Qué se sabe de la disposición a pagar por ahorro de horas de tramitación frente a pagar a una gestoría por expediente (cita tarifas públicas de gestorías de tramitación si existen).
7. **Retención y expansión:** qué hace que una herramienta de tramitación sea «pegajosa» (histórico, portal de cliente, multiusuario, integraciones), los indicadores de abandono típicos en SaaS B2B de pymes, y cómo la estacionalidad (subvenciones, picos de autoconsumo) afecta al flujo.
8. **Fuentes de ingreso alternativas:** comisiones por derivar financiación, seguros, ayudas o equipos; patrocinio de fabricantes; datos agregados (solo señalar el potencial; el detalle está en el eje 3); formación certificada; licencias de marca blanca para asociaciones o distribuidores.
9. **Estrategia de lanzamiento por CCAA:** si conviene concentrarse en pocas comunidades donde la normativa pueda estar verificada y ser excelente en lugar de prometer 17. Evidencia de SaaS verticales que ganaron por densidad local.
10. **Plan de 6 meses:** hitos, métricas (activación, conversión Free→Pro, retención a 90 días, coste por cliente), canal prioritario y qué dejar de hacer, para una sola persona.

## FUERA DE ALCANCE (lo cubren otros ejes)
La construcción del asistente con citas (eje 1), los cálculos de ahorro (eje 2), la verificación normativa (eje 5) y la valoración por un comprador estratégico (eje 7).

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
