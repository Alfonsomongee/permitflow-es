# Auditoría de coherencia producto ↔ experiencia real — Fase 3

**Fecha:** 2026-08-12
**Pregunta que responde este documento:** no "¿funciona el código?", sino "¿lo que el cliente cree que está comprando es lo que realmente recibe?"

Todo lo citado aquí es texto literal encontrado en el repositorio (componente + línea) o el resultado de una ejecución real del motor normativo con datos de prueba. Donde algo es una opinión mía sobre percepción del cliente, lo marco como tal — no es medible por grep.

---

## 1. Inventario de promesas del producto

| Funcionalidad | Qué promete la interfaz | Qué promete el texto | Qué entiende el cliente | Qué hace el código realmente | ¿Justificada? |
|---|---|---|---|---|---|
| "Motor normativo automatizado por IA" (`app/(auth)/sign-up/page.tsx:48`) | Aparece en la pantalla de registro, como argumento de venta antes incluso de entrar al producto | "IA" sin matiz | Que un modelo de lenguaje interpreta la normativa y decide el trámite | `motor_normativo/clasificador.py` es reglas JSON + `json-logic` deterministas. Cero LLM en la decisión de qué trámite aplica. El único punto de IA real del producto es el pipeline BOE (ver fila siguiente) y el texto del asistente/bot | **No.** Es la promesa más grave del inventario porque aparece en el primer contacto con el producto, antes de que el usuario pueda contrastarla con nada |
| "Simulador de Ahorro Solar IA" / "Calcula tu ahorro... con nuestra IA" (`app/(dashboard)/simulador/page.tsx:5,12`) | Título de página y meta-descripción | "IA" en el nombre del producto | Que el ahorro se calcula con un modelo de IA | `calculo_financiero.py` es determinista por diseño explícito (comentario propio: *"nunca decide una cifra de ahorro, coste o payback"* el LLM). La IA solo redacta el texto de recomendación final | **No**, y es contradictorio con la propia arquitectura interna, que se enorgullece (con razón) de NO usar IA para las cifras |
| "Cambios normativos detectados automáticamente por el pipeline de IA" (`/alertas`) | Subtítulo de la página de alertas | "pipeline de IA" | Que un sistema de IA vigila el BOE | Verificado: `scripts/boe_pipeline.py` usa DeepSeek de verdad (filtro + análisis + diff sugerido), corre por GitHub Actions dos veces por semana, y las alertas llegan marcadas "pendiente de revisión" hasta que un humano aprueba el PR | **Sí.** Es la única promesa de "IA" del producto que está construida como se anuncia |
| "Sugerencia IA — pendiente de revisión" (`AlertasBoeList.tsx:31`) | Etiqueta sobre cada alerta individual | Distingue explícitamente hipótesis de IA sin revisar de un cambio ya confirmado | El usuario sabe que eso concreto aún no está verificado por un humano | Coincide exactamente con el flujo real (PR sin mergear = sin aplicar) | **Sí** |
| "Sube tu factura" (simulador) | Invita a subir la factura real para personalizar el resultado | Implica personalización con datos reales | Que el ahorro calculado usará mi consumo Y mi precio reales | `informes_ia.py:109-116` usa el consumo real (sí), pero **nunca pasa el precio real** — el precio siempre es la media nacional de Eurostat (0,261 €/kWh, dato de S1-2025). Los parsers de factura (`facturas_parser.py`, `datadis_parser.py`) ni siquiera extraen un precio | **Parcialmente.** La promesa de "usa tu factura" se cumple a medias: mejora el consumo, no mejora el precio, y la interfaz no distingue ambos grados de personalización |
| "Análisis normativo" / cobertura por CCAA | Landing y `/producto/motor-normativo` | Usa constantemente el vocabulario "verificada / no verificado / con observaciones" en vez de afirmar cumplimiento absoluto | El usuario entiende, correctamente, que hay grados de certeza | Coincide: cada trámite lleva `nivel_verificacion`, cada JSON documenta su fuente, y el propio marketing dice *"Cuando la normativa autonómica aún no está verificada, lo decimos — no lo ocultamos"* (`QuienesSomosSection.tsx:16`) | **Sí, y es el punto más honesto de todo el producto** |
| "Estimación" / "Ahorro proyectado" | Aparece junto a resultados económicos | Sugiere aproximación, no certeza | Depende de dónde se muestre — ver §3, la palabra "estimado" convive con formato de moneda a céntimo exacto | Los números vienen de horquillas de mercado con nota "no verificado" (`benchmarks_fv.ts`) colapsadas a su punto medio | **Justificada en el fondo (el motor lo etiqueta como supuesto), no en la forma (se presenta como una cifra exacta)** — desarrollado en §3 |
| "Sin registro, sin tarjeta. El resultado en segundos" (CTA landing, `ComoFuncionaSection.tsx:73-75`, enlaza a `/nueva-instalacion`) | Es el llamado a la acción principal de toda la landing | Promesa explícita y literal de acceso sin cuenta | Un visitante espera poder clasificar una instalación sin crear cuenta | `middleware.ts` protege `/nueva-instalacion` con `auth.protect()` de Clerk — no está en la lista de rutas públicas. El clic lleva a una pantalla de registro/login | **No, y es una promesa falsa verificable en un clic.** Ver §2 y §6 |
| "5 clasificaciones al mes" (plan Free) / "Alertas BOE" como función exclusiva de Pro (`PreciosSection.tsx`) | Tabla de precios | Diferenciador explícito entre planes de pago | El cliente que paga Pro espera algo que el Free no tiene | No existe ningún contador de clasificaciones mensuales en todo el repositorio (verificado por búsqueda exhaustiva), y `/alertas` no comprueba `plan` en ningún punto — cualquier organización autenticada, Free incluida, ve las alertas BOE completas | **No.** Es una promesa de negocio (qué se paga) sin ejecución técnica que la haga cierta |

---

## 2. Auditoría de copys y mensajes

| Mensaje mostrado | Origen | Condición real que lo dispara | Precisión técnica | Riesgo de interpretación incorrecta |
|---|---|---|---|---|
| *"Sin registro, sin tarjeta. El resultado en segundos"* | `ComoFuncionaSection.tsx:73-75` | Siempre visible en la landing, sin condición | Falsa: el enlace exige login | **Alto.** Es la frase que un visitante lee justo antes de decidir si probar el producto o irse |
| *"Motor normativo automatizado por IA"* | `sign-up/page.tsx:48` | Siempre visible en registro | Engañosa por sobreextensión: el motor no usa IA | **Alto** en un producto cuyo argumento de venta es precisamente el rigor normativo verificable, no la "magia" de un modelo — sobrevender IA aquí resta credibilidad al verdadero diferencial (reglas verificadas con fuente) |
| *"Revisión 2026-07-28: confirmado que el fichero ya diferencia clase_instalacion_gas... no se detectaron cambios adicionales necesarios"* | Campo `huecos_verificacion` de `motor_normativo/reglas/cataluna/gas_baja_presion.json` (y también en `acs.json`, `climatizacion_aerotermia.json` de Cataluña), renderizado literalmente en `PlanTramitacionView.tsx:111` | Cualquier expediente de gas/ACS/climatización en Cataluña | Es una nota de auditoría interna de desarrollo, no información de cumplimiento normativo | **Muy alto.** Un despacho profesional que presente esto a su cliente estaría enseñándole, sin saberlo, un apunte de control de calidad interno del proveedor del software. Rompe la ficción de "informe profesional" de raíz — ver detalle en §4, caso complejo |
| *tramite.notas* con lenguaje como *"hueco confirmado en auditoría 2026-07-27, no modelada como trámite propio"* (Andalucía, fotovoltaica) | `TramiteCard.tsx:395-398`, leyendo directamente el campo `notas` del JSON de reglas | Expedientes fotovoltaicos en Andalucía en varios trámites | El contenido sustantivo (la fase de activación con la distribuidora) es correcto y útil; la coletilla de fecha de auditoría es ruido interno mezclado con el aviso legal | **Medio.** No es tan grave como el caso anterior porque el contenido útil predomina, pero la mezcla de dos registros de voz (nota legal para el cliente / bitácora de desarrollo) es sistemática, no un accidente aislado |
| *"La generación de documentos es una función del plan Pro"* (402, con `upgrade: "/#precios"`) | `app/api/expedientes/[id]/documentos/route.ts:50` | Organización sin `suscripcion_activa` ni plan enterprise intentando generar un documento | Exacta: el gate existe y el mensaje describe la causa real | **Bajo.** Ejemplo de cómo debería ser todo mensaje de paywall del producto |
| *"Para este tipo de instalación, nuestro equipo te preparará un análisis personalizado. Al hacer clic en «Siguiente» te redirigiremos al formulario de contacto"* | `simulator-wizard.tsx:312-317` | Usuario selecciona "empresa" o "comunidad de vecinos" en el simulador | Exacta: el simulador reconoce su propio límite (solo residencial) y no finge calcular algo que no sabe calcular | **Bajo.** Ejemplo de honestidad de alcance bien resuelta |
| Badge de plazo *"día 12 · quedan 18d (30 hábiles)"* con asterisco opcional | `TramiteCard.tsx:59-73` | Cualquier trámite en curso con plazo legal en días hábiles | La cifra es exacta dado el cálculo, pero el cálculo en sí admite dos fuentes de imprecisión (calendario de festivos no cargado para el año, festivos locales del municipio nunca incluidos) explicadas solo en el atributo `title` (tooltip al pasar el ratón) | **Medio-alto en móvil/tablet**, donde no hay hover: el usuario ve un número exacto de días sin ninguna vía visible para descubrir que es aproximado |
| *"El tiempo total es orientativo y asume trámites en serie"* | Advertencia general en `advertencias` (aparece en los 3 casos rastreados en §4) | Siempre que el plan tenga más de un trámite | Exacta y bien ubicada — es la contrapartida honesta al plazo con apariencia exacta | **Bajo**, siempre que el usuario la lea; es el mismo problema estructural del punto anterior: el matiz existe, pero compite en visibilidad con el número grande y concreto de al lado |
| *"Este incentivo no participa en las simulaciones de rentabilidad por no contar con una base legal verificada actualmente"* | `IncentiveCard.tsx:41` | Incentivos con `status: pending_verification` o similar | Exacta | **Bajo** — de nuevo, transparencia bien resuelta a nivel de componente individual |

**Patrón que se repite en toda la tabla:** el producto tiene dos registros de voz que conviven sin fricción aparente para quien lo construye, pero con fricción real para quien lo usa: uno es el lenguaje pensado para el cliente final (cuidado, matizado, con "no lo ocultamos" como principio explícito), y otro es lenguaje de bitácora interna de desarrollo que se filtra en los mismos campos JSON que alimentan la UI porque no hay una frontera de datos entre "nota para v.º" y "nota para el cliente".

---

## 3. Falsa precisión — listado de casos

1. **Ahorro anual del Simulador AI mostrado en formato moneda a céntimo** (`informe-interactivo.tsx:87,117,146`: `Intl.NumberFormat('es-ES', {style:'currency'...})`). El número resulta de multiplicar una horquilla de coste (900-1.400 €/kWp, no verificada) colapsada a su punto medio, por una horquilla de ratio de autoconsumo (20-40%) también colapsada a su punto medio, por un precio nacional medio con más de un año de antigüedad. El resultado, p. ej. "1.096,20 €/año", se presenta con el mismo formato que un importe de factura real. Ninguna de las tres horquillas de entrada tiene esa precisión.
2. **El mismo dato en `/orientacion` se muestra correctamente como rango** (`SimuladorAhorro.tsx:110-128`: `"1.200€ - 1.850€"`, `"6,2 - 9,1 años"`). Es la comparación más clara del documento: la misma pregunta de negocio, resuelta con dos niveles de honestidad estadística distintos según qué pantalla la responda.
3. **Plazos en "días hábiles" exactos** (`día 12 · quedan 18d`) que excluyen festivos nacionales y autonómicos pero nunca festivos locales, y que además dependen de un calendario de festivos cargado por año (`calendarioVerificado`) — cuando no está cargado, el número se sigue mostrando igual de exacto, solo cambia un asterisco discreto (§2).
4. **`potencia_kwp: 10.0` y `coste_inicial: 11.500,0 €` para consumos extremos** (verificado en ejecución, §5 de la fase 2 de esta auditoría): el clamp a los límites `[1.5, 10]` kWp presenta el tope como si fuera un dimensionamiento calculado para ese consumo específico, cuando en realidad es un límite de seguridad genérico que se activa igual para 10.000 kWh/año que para 10.000.000.
5. **Deducciones fiscales con porcentaje exacto pero base incompleta**: `content/legal/incentives/index.ts` muestra "20%", "10%", "15%" con precisión de punto porcentual para incentivos marcados `status: 'pending_verification'` — el porcentaje se presenta con la misma tipografía y peso visual que un dato confirmado, y solo el badge de estado (más pequeño) indica la diferencia.
6. **Clasificación de trámites aparentemente determinista**: el resultado del clasificador se presenta como una lista fija de trámites sin indicar, en la propia tarjeta, qué porcentaje de esa lista proviene de una regla con fuente verificada y qué porcentaje de una regla en `pending_verification` — esa distinción existe en el dato (`nivel_verificacion` por trámite) pero no se resume visualmente a nivel de plan completo, solo trámite a trámite si el usuario los revisa uno por uno.

---

## 4. Rastreo completo de 3 casos reales

Ejecutados de verdad contra `motor_normativo.clasificador.Clasificador` con `ClasificadorInput` real (no simulado a mano).

### Caso 1 — Residencial sencillo (FV 4,5 kW, Madrid, con excedentes y compensación)

- **Entrada:** 6 campos (`tipo_instalacion`, `comunidad`, `potencia_kw`, `uso`, `tension`, `modalidad_autoconsumo`). El schema no pidió nada más — validación cross-field superada a la primera.
- **Motor normativo:** resuelve en un único fichero JSON (`madrid/fotovoltaica_autoconsumo.json`), sin ramas adicionales.
- **Salida:** 2 trámites (EICI, inscripción de oficio en el Registro de Autoconsumo), advertencia genérica de plazo orientativo, 3 huecos de verificación (registro de producción, documentación de puesta en servicio, tasas).
- **Frontend:** el plan se renderiza limpio, sin ruido — es el caso mejor resuelto de los tres. **Ninguna pérdida de información entre backend y pantalla.**

### Caso 2 — PYME (IRVE, 6 puntos, 132 kW, garaje comunitario, Cataluña)

- **Entrada:** el schema fue rechazando campos uno a uno con mensajes específicos y correctos (`uso_edificio`, `ventilacion_garaje`, `numero_plazas_garaje`) hasta llegar a 9 campos obligatorios frente a los 6 del caso residencial. **Esto es correcto** — un garaje comunitario con recarga eléctrica en Cataluña tiene más condicionantes reales (ITC-BT-04) que una FV residencial — pero revela que el formulario del frontend (`Step2ParametrosTecnicos.tsx`) tiene que anticipar esa profundidad condicional sin que el usuario sepa de antemano cuántos campos le van a pedir; no hay indicación de "este caso necesitará más datos que el residencial típico" antes de empezar.
- **Nota sobre el propio nombre del caso:** el "Simulador de Ahorro" explícitamente NO calcula este perfil — lo redirige a un formulario de contacto (§1). Solo el flujo de "Nueva instalación" (clasificador de trámites, no de ahorro) llega a procesar un caso PYME con datos reales.
- **Frontend:** sin pérdidas relevantes una vez completados los campos — el motor devuelve el trámite correcto con su fuente.

### Caso 3 — Complejo (gas baja presión, ampliación, Cataluña)

- **Entrada:** encadenó 4 validaciones cruzadas sucesivas (`potencia_kw` → `potencia_resultante_kw` → `presion_resultante_bar`) antes de aceptar el caso — 10 campos en total frente a los 6 del residencial.
- **Salida:** 1 trámite, en catalán, con el nombre oficial exacto del procedimiento ("Presentació de la declaració responsable..."). **Esto es correcto por diseño** — el nombre de un trámite oficial no debe traducirse, porque el usuario necesita ese nombre exacto para buscarlo en la sede electrónica — pero en una interfaz que es 100% castellano en el resto de textos, un usuario que no lea catalán puede dudar durante un segundo si es un error de idioma o el nombre real del trámite. No hay ninguna nota que lo aclare ("nombre oficial en catalán, así aparece en la sede de la Generalitat").
- **El hallazgo real de este caso:** el array `huecos_verificacion` que llega al frontend contiene la frase de auditoría interna citada en §2 ("Revisión 2026-07-28: confirmado que... no se detectaron cambios adicionales necesarios"). **Esta es la única pérdida de coherencia real de los tres casos, y es la más grave del documento**: no es un dato incompleto ni una simplificación razonable, es contenido que nunca debió cruzar la frontera entre "ficha de trabajo del equipo" y "informe para el cliente", y lo hace porque ambos usan literalmente el mismo campo de texto libre en el mismo JSON.

**Patrón transversal a los tres casos:** cuanto más complejo es el caso real (más condicionantes normativos genuinos), más campos exige el formulario — lo cual es correcto — pero también aumenta la probabilidad de tocar una regla que todavía lleva marcas de trabajo interno sin limpiar, porque las comunidades/verticales más recientemente auditadas (Cataluña, Andalucía) son las que más anotaciones de proceso acumulan en sus JSON.

---

## 5. Auditoría de confianza por pantalla

Pregunta aplicada a cada una: *¿un despacho profesional pagaría dinero por esto, tal como está hoy?*

| Pantalla | Confianza | Utilidad | Diferenciación | Riesgo reputacional | Nota |
|---|---|---|---|---|---|
| Expedientes / Plan de trámites | 8/10 | 9/10 | 9/10 | **Alto si el caso toca Cataluña/gas/ACS/climatización** — ver §4 | Es la pantalla que mejor demuestra el producto, salvo por la fuga de notas internas, que ahí mismo puede hundir la confianza que el resto de la pantalla se ha ganado |
| Nueva instalación (formulario) | 8/10 | 9/10 | 8/10 | Bajo, salvo por la promesa incumplida de "sin registro" que lo precede desde la landing | El formulario en sí es riguroso; el problema de confianza empieza antes de llegar a él |
| Orientación | 7/10 | 7/10 | 6/10 | Medio — datos fiscales casi vacíos para 16 CCAA (fase 2, §4) pueden parecer "la app no sabe de mi comunidad" en vez de "el dato no está cargado aún" | Los rangos honestos suben la confianza; el vacío de incentivos la baja |
| Simulador AI | **5/10** | 6/10 | 4/10 | **Alto** — nombre "IA" no correspondiente + precisión de céntimo sobre supuestos + precio siempre genérico incluso con factura real subida | Es la pantalla con mayor distancia entre lo que promete el nombre y lo que hace el código |
| Alertas BOE | 8/10 (contenido) / **3/10 (como producto de pago)** | 9/10 | 10/10 | Bajo de cara al cliente final, **alto de cara al propio negocio**: es la función mejor diferenciada y no está cobrándose de facto | El contenido es excelente; el modelo de negocio alrededor no está construido |
| Plantillas | 7/10 | 7/10 | 7/10 | Bajo | Sólida, sin sorpresas, ya corregido el acento "IA" indebido en fase anterior |
| Estadísticas | 7/10 | 6/10 | 5/10 | Bajo | Correcta pero de menor diferenciación — es gestión, no producto único |
| Ajustes | 6/10 | 5/10 | N/A | Bajo | Cumple su función de higiene, no necesita puntuar alto |

**La pantalla que un despacho enseñaría a un cliente final** (plan de trámites o informe del simulador) es también la que puede, en dos comunidades concretas, mostrarle una frase de control de calidad interno del proveedor de software. Es el mayor riesgo reputacional puntual de todo el producto — no por frecuencia (afecta a un subconjunto de expedientes), sino porque ocurre exactamente en el momento de mayor exposición ante el cliente del despacho.

---

## 6. Hallazgo final

Si mañana tuviera que enseñar este producto a un cliente real y mi reputación dependiera de ello, corregiría estas tres cosas antes de que nadie más lo viera:

**Primero, dejaría de prometer en la puerta de entrada algo que no existe.** La página que ve todo el mundo antes de decidir si probar el producto dice "sin registro, sin tarjeta" y lleva directamente a una pantalla de crear cuenta. Es la peor clase de mentira porque se descubre en el primer clic, gratis, sin que el cliente tenga que buscarla. O se cumple la promesa (se permite probar sin cuenta) o se cambia el texto. No hay una tercera opción que no cueste confianza.

**Segundo, borraría cualquier rastro de "hablamos entre nosotros" de las pantallas del cliente.** Encontré, en al menos tres tipos de instalación en Cataluña, notas internas del equipo de desarrollo —del estilo "revisado, no hacía falta tocar nada"— mezcladas literalmente en el mismo informe que un gestor le entregaría a su cliente. Esto no es un detalle técnico: es como si un abogado le pasara a su cliente un contrato con post-its internos del despacho todavía pegados. Se nota inmediatamente y cuesta muchísimo recuperar la sensación de "esto es un informe profesional" una vez rota.

**Tercero, dejaría de llamar "IA" a lo que no lo es, y presumiría más de lo que sí es un logro real.** El nombre del simulador y el mensaje de bienvenida al registrarse presumen de inteligencia artificial en la parte del producto que precisamente NO la usa —los cálculos son fórmulas fijas, verificables, auditables, que es exactamente lo que un despacho serio debería querer—. Mientras tanto, la parte que sí usa IA de verdad y bien —la vigilancia automática de cambios normativos en el BOE— está escondida en la posición cinco del menú y no se menciona en la portada. Están vendiendo lo que no tienen y escondiendo lo que sí tienen. Cambiaría los dos: quitaría "IA" de donde no corresponde y pondría el foco comercial en la vigilancia normativa automática, que es, con diferencia, lo más difícil de replicar por la competencia.
