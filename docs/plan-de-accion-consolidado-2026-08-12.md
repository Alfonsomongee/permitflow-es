# Plan de acción consolidado

**Fecha:** 2026-08-12
**Fuentes:** `auditoria-integral-2026-08-11.md` (Fase 1), `auditoria-fase2-2026-08-12.md` (Fase 2), `auditoria-fase3-coherencia-producto-2026-08-12.md` (Fase 3). Las auditorías de QA del motor normativo y de UX/UI del 11/08 no aparecen aquí porque sus hallazgos ya están corregidos y verificados con tests — este plan es exclusivamente lo que sigue abierto.

28 hallazgos, consolidados desde ~45 items brutos de los tres informes (varios I-numerados de Fase 1 y varios hallazgos de Fase 2/3 describen el mismo problema desde ángulos distintos; los fusiono en una sola tarea ejecutable donde corresponde, citando todas las fases de origen).

---

## Corregir esta semana

Todos de esfuerzo bajo o trivial. Ninguno requiere decisión de negocio — son correcciones directas.

| # | Hallazgo | Origen | Esfuerzo | Impacto usuario | Impacto negocio | Impacto credibilidad | Riesgo si no se corrige |
|---|---|---|---|---|---|---|---|
| P-01 | CTA de landing "Sin registro, sin tarjeta" enlaza a una página que exige cuenta | Fase 3 | Bajo | Alto | Alto (conversión) | Muy alto | Cada visitante nuevo descubre la mentira en el primer clic |
| P-02 | "IA" en sign-up ("motor normativo automatizado por IA") y en `/simulador` (título + meta), sobre motores deterministas | Fase 1 (I-10), Fase 3 | Bajo | Medio | Medio | Muy alto | Sigue vendiéndose por lo que no es, y devalúa el único uso real de IA (pipeline BOE) |
| P-03 | Notas de auditoría interna de desarrollo filtradas en `huecos_verificacion`/`notas` de 3 JSON de Cataluña (acs, climatización, gas) | Fase 3 | Trivial | Alto (para esos expedientes) | Medio | Crítico | Un despacho sigue enseñando a su cliente un apunte de control de calidad interno |
| P-04 | Barrido de los 85 JSON de reglas en busca de más notas de desarrollo con el mismo patrón que P-03 | Fase 3 (extensión) | Bajo | — | — | Alto (preventivo) | Sin el barrido, no hay garantía de que Cataluña sea el único caso |
| P-05 | `calcular_escenario_fv` no valida `NaN`/`Infinity` en `consumo_anual_kwh`: produce una cotización de 10 kWp/11.500 € con total normalidad | Fase 2 | Trivial | Medio-alto | Medio | Alto | Un fallo de parseo de factura se convierte en un número inventado y presentado con seguridad |
| P-06 | Payback nunca a 0: cerrar el hueco fuera del barrido del test de regresión (`precio_kwh` extremo) | Fase 1 (I-02, ya corregido en el caso principal), Fase 2 | Trivial | Bajo hoy | Bajo | Medio | El test actual da una garantía que no es cierta; si se expone `precio_kwh` en el futuro, el bug vuelve sin aviso |
| P-07 | Aviso cuando el consumo supera el dimensionamiento máximo (10 kWp) sin decirlo | Fase 1 (I-08) | Bajo | Medio | Bajo | Medio | El informe calla que no cubre el perfil real del cliente de alto consumo |
| P-08 | Renombrar "factura actual" (no incluye término de potencia) | Fase 1 (I-05) | Trivial | Medio-alto | Bajo | Alto | El usuario compara con su factura real, no cuadra, y desconfía de todo el informe |
| P-09 | Mostrar la fecha del precio de la electricidad junto al resultado | Fase 1 (I-04) | Trivial | Medio | Bajo | Medio | El precio sigue envejeciendo sin que nadie lo perciba |
| P-10 | Leyenda visible (no solo tooltip) para plazos con calendario de festivos no verificado o festivos locales no incluidos | Fase 3 | Bajo | Medio | Bajo | Medio | En móvil/tablet, sin hover, el matiz de "aproximado" es invisible |
| P-11 | Nota aclaratoria cuando el nombre de un trámite aparece en catalán/euskera/gallego ("nombre oficial, tal como consta en la sede") | Fase 3 | Trivial | Bajo | — | Bajo | Duda momentánea del usuario sobre si es un error |

---

## Corregir este mes

Esfuerzo medio: requieren más de una sesión de trabajo o tocan varios archivos, pero no exigen decisión de negocio previa.

| # | Hallazgo | Origen | Esfuerzo | Impacto usuario | Impacto negocio | Impacto credibilidad | Riesgo si no se corrige |
|---|---|---|---|---|---|---|---|
| P-12 | Conectar `content/incentivos_ccaa.ts` (16 CCAA de datos fiscales ya escritos) a la UI real de incentivos | Fase 2 | Medio | Alto | Alto | Alto | El producto sigue pareciendo vacío en 16 de 17 comunidades en la sección fiscal, con el dato ya existente sin usar |
| P-13 | Precargar/cachear los JSON del motor normativo (`lru_cache` o `lifespan`) | Fase 2 | Bajo-medio | — | Medio (escala) | — | I/O innecesario en el endpoint más usado; cuello de botella si crece el tráfico |
| P-14 | Redis a conexión de vida larga (`lifespan`) en vez de por petición | Fase 2 (B-13, ya documentado desde 06/08) | Medio | — | Alto (escala) | — | Ya está identificado hace más de un mes; es el riesgo de producción más citado del repositorio |
| P-15 | Reposicionar Alertas BOE (subir en el sidebar, mencionar en landing) | Fase 1 (I-06 recom., I-13), Fase 3 | Bajo-medio | Alto | Alto | Alto | Se sigue escondiendo el argumento más diferencial del producto y el único uso real de IA |
| P-16 | Mostrar rango (no punto único) en `/simulador`, igual que ya hace `/orientacion`; quitar formato de moneda a céntimo para cifras basadas en supuestos | Fase 1 (I-03), Fase 3 (§3.1) | Medio | Alto | Medio | Alto | Misma pregunta, dos respuestas con distinto nivel de honestidad estadística según la pantalla |
| P-17 | Fuente única para constantes de mercado (`benchmarks_fv.ts` / `calculo_financiero.py`), con generador siguiendo el patrón ya usado en `cobertura_normativa.ts` | Fase 1 (I-09), Fase 2 | Medio | — | Bajo | Bajo | Ambos ficheros están sincronizados hoy por disciplina manual únicamente; es cuestión de tiempo que diverjan |
| P-18 | Endurecer validación del formulario de nueva instalación (campos numéricos sin `.refine()` de positividad) y traducir mensajes de error de Pydantic a español limpio | Fase 2 (§3.4) | Bajo | Medio | Bajo | Bajo | Papercuts de UX; el dato nunca llega a persistirse mal, pero el formulario es inconsistente consigo mismo |
| P-19 | Wiring de DELETE de expediente (backend ya existe y está testeado; falta ruta + botón + confirmación) | Fase 2 (§2) | Bajo-medio | Medio | Bajo | Bajo | Gap de producto acumulativo: no se puede borrar un expediente creado por error |
| P-20 | Limpieza de código muerto confirmado por herramienta: `lib/demo-data.ts`, `components/chat/buildSystemPrompt.ts`, `components/ui/slider.tsx`, 4 barrels sin usar, `actualizarEstado()`, `register*/get*`/`fundingCallsCatalog` de `lib/legal/catalog.ts` | Fase 2 (§2) | Bajo | — | — | Bajo (salud de repo) | Deuda silenciosa; el próximo desarrollador puede construir sobre un barril que parece vigente y no lo es |
| P-21 | Resolver los `catch(() => {})` sin log en `NotificationBell.tsx` y el `catch {}` sin comentar en `asistente/route.ts` | Fase 1 (I-11, I-12) | Trivial | — | — | Bajo | Dificulta el debug si falla, nadie se entera |

---

## Mejoras recomendadas

Impacto real, pero de mayor esfuerzo o que requieren una decisión previa (de producto o de negocio) antes de picar código.

| # | Hallazgo | Origen | Esfuerzo | Impacto usuario | Impacto negocio | Impacto credibilidad | Riesgo si no se corrige |
|---|---|---|---|---|---|---|---|
| P-22 | Decidir el destino de `economic-projection.ts`: conectarlo (mover a backend, exponer supuestos, tests de integración) o borrarlo | Fase 1 (I-01), Fase 2 | Alto si se conecta / Bajo si se borra | Alto | Alto | Alto | Desviación de hasta 17% en el caso de mayor consumo, con 12 tests verdes dando cobertura falsa. **Es el hallazgo más citado en las tres fases** |
| P-23 | Enforcement real del plan Free: contador de clasificaciones/mes + gate de Alertas BOE | Fase 3 (§1, §2) | Medio-alto | — | Alto | Medio | Hoy se regala de facto lo que la tabla de precios vende como exclusivo de Pro — **decisión de negocio antes que técnica**: ¿limitar de verdad, o cambiar lo que promete la tabla? |
| P-24 | Pasar el precio real de la factura parseada a `calcular_escenario_fv` cuando exista, en vez de usar siempre el precio medio nacional | Fase 2 (§4) | Medio-alto | Alto | Medio | Alto | La promesa "sube tu factura, te lo calculamos con tus datos" se cumple solo a medias |
| P-25 | Recalibrar el ratio de autoconsumo cuando hay perfil mensual real (hoy penaliza aportar más datos) | Fase 1 (I-07) | Medio-alto | Medio | Bajo | Medio | Penaliza justo la funcionalidad más "premium" (CSV de Datadis): aportar datos reales empeora el ahorro estimado |
| P-26 | Unificar prefijo de API (`/api/v1/*` en contacto, newsletter, simulador) | Fase 2 (§1) | Medio | — | Bajo hoy / Alto si hay integraciones futuras | Bajo | Bloqueo de facto para versionar la API sin romper tres rutas; cuanto más se tarde, más integraciones habrá que fijar |
| P-27 | Unificar tipos del simulador (`types/simulador.ts` manual vs `lib/schemas/simulador.ts` con Zod) | Fase 2 (§4) | Medio | — | — | Bajo | Dos fuentes de verdad tipadas de forma independiente; el compilador no avisa si divergen |
| P-28 | Resumen visual agregado del nivel de verificación normativa por plan completo, no solo trámite a trámite | Fase 3 (§3, caso 6) | Medio | Medio | Bajo | Medio | El dato existe (`nivel_verificacion` por trámite) pero no se resume; el usuario tendría que revisar cada tarjeta una a una |

---

## Mejoras opcionales

Aportan valor real pero de alcance mayor que una corrección puntual — encajan mejor como iniciativa de trimestre que como tarea suelta.

- **Modo invitado real** (probar el clasificador sin cuenta, con conversión a registro después de ver el resultado). Es la solución "completa" a P-01, pero implica sesión temporal, límites de abuso sin autenticación y migración de datos a cuenta — varias semanas, no una corrección de copy.
- **`openapi-typescript` en el postinstall** para generar automáticamente los tipos del frontend desde el backend, eliminando de raíz la necesidad de P-27 y de cualquier sincronización manual futura de tipos.
- **Fusión completa de Orientación y Simulador** en una sola sección con dos niveles (estimación rápida / análisis detallado), en vez de solo corregir la presentación de cada una por separado (P-16). Es un rediseño de navegación, no una corrección.
- **Modelar el término de potencia real** en la factura (en vez de solo renombrar el concepto en P-08) — requeriría datos de potencia contratada con más fiabilidad de la que hoy se captura.

---

## Mejoras que NO merece la pena hacer (ahora)

- **Framework de "plugin" genérico para futuros motores de cálculo**, construido preventivamente. No hay hoy un cuarto motor real que lo justifique; construirlo ahora es complejidad especulativa.
- **Completar `fundingCallsCatalog`** (sistema de convocatorias de ayudas) tal como está esbozado en `lib/legal/catalog.ts`. No hay contenido real que poblarlo — mejor limpiarlo (P-20) y revisitar la idea si algún día hay un caso de negocio concreto.
- **Rate limiting por usuario autenticado en vez de por IP.** No hay evidencia en esta auditoría de que el limitado por IP esté causando un problema real; especular sobre ello sin un caso concreto no es buen uso del tiempo.
- **Reescribir el sistema de precios/planes desde cero.** La estructura (`free`/`pro`/`enterprise` + `suscripcion_activa`) ya funciona para documentos, estadísticas y validador. El problema (P-23) es de cobertura, no de diseño — no hace falta rehacer lo que ya está bien planteado.

---

## Las 20 tareas con mejor ratio impacto/esfuerzo, en orden de ejecución

Secuenciadas por dependencia real (primero lo independiente y sin riesgo, después lo que conviene hacer sobre una base ya limpia):

| Orden | Tarea | Riesgo de regresión | Revisión manual necesaria | Mejora perceptible para el cliente |
|---|---|---|---|---|
| 1 | P-01 — Corregir copy "Sin registro, sin tarjeta" | Ninguno | No | **Sí, inmediata** |
| 2 | P-02 — Quitar "IA" de sign-up y `/simulador` | Ninguno | Revisión de copy recomendable, no bloqueante | **Sí** |
| 3 | P-03 — Borrar las 3 notas de auditoría interna en JSON de Cataluña | Ninguno | No | **Sí**, para esos expedientes |
| 4 | P-04 — Barrido de los 85 JSON en busca de más notas filtradas | Ninguno (el barrido es solo detección) | Sí, para decidir qué hacer con cada resultado nuevo | Indirecta |
| 5 | P-08 — Renombrar "factura actual" | Ninguno | No | **Sí** |
| 6 | P-09 — Mostrar fecha del precio de electricidad | Ninguno | No | Sí, sutil |
| 7 | P-11 — Nota aclaratoria de trámites en otro idioma cooficial | Ninguno | No | Sí, sutil |
| 8 | P-05 — Guard `NaN`/`Infinity` en `calcular_escenario_fv` | Ninguno (añade validación) | No | No directa, evita un daño serio |
| 9 | P-06 — Cerrar el hueco del payback en el rango extremo de precio | Ninguno | No | No directa |
| 10 | P-07 — Aviso cuando el consumo excede el dimensionamiento máximo | Ninguno | No | Sí, para consumo alto |
| 11 | P-10 — Leyenda visible de plazo aproximado | Ninguno | No | Sí, sutil |
| 12 | P-21 — Loggear los `catch` silenciosos | Ninguno | No | No |
| 13 | P-20 — Limpieza de código muerto confirmado | Mínimo (verificado con `ts-prune`, sin consumidores) | No | No |
| 14 | P-13 — Precargar/cachear JSON del motor normativo | Bajo, pero toca ciclo de vida del servicio — probar en staging | Sí | No directa |
| 15 | P-14 — Redis a conexión de vida larga | Medio — toca infraestructura compartida por 3 endpoints | Sí | No directa, pero crítico a escala |
| 16 | P-15 — Reposicionar Alertas BOE en nav y landing | Ninguno | Revisión de diseño recomendable | **Sí** |
| 17 | P-18 — Endurecer validación de formulario + mensajes en español | Ninguno | No | Sí, sutil |
| 18 | P-19 — DELETE de expediente con confirmación | Ninguno nuevo (función ya testeada) | Sí, por ser acción destructiva — revisar el diseño de la confirmación | **Sí** |
| 19 | P-17 — Fuente única de constantes de mercado | Ninguno (tooling) | No | No |
| 20 | P-12 — Conectar 16 CCAA de incentivos fiscales | Bajo, pero es contenido `pending_verification` publicado por primera vez | **Sí, alguien debe revisar el dato antes de mostrarlo** | **Sí, mucho** |

**Fuera del top 20 pero mencionadas explícitamente porque el usuario las pidió evaluar:** P-16 (rango en simulador) y P-23 (enforcement Free) tienen impacto alto pero esfuerzo/decisión previa suficientes para no entrar en el corte de "mejor ratio" — están en "corregir este mes" y "mejoras recomendadas" respectivamente, no descartadas.

### Pueden implementarse sin riesgo de regresión
P-01, P-02, P-03, P-05, P-06, P-07, P-08, P-09, P-10, P-11, P-18, P-20, P-21. Todas son cambios de texto, adición de una validación, o borrado de código ya verificado como sin consumidores.

### Necesitan revisión manual antes o durante la ejecución
P-04 (decidir qué hacer con cada nota filtrada que se encuentre), P-12 (contenido fiscal `pending_verification` publicado por primera vez — alguien debe darlo por bueno antes de que lo vea un cliente), P-13 y P-14 (tocan infraestructura compartida, probar antes de desplegar), P-19 (acción destructiva, revisar el flujo de confirmación), P-22 (decisión de producto: conectar o borrar `economic-projection.ts`), P-23 (decisión de negocio: ¿se limita de verdad el plan Free o se cambia la tabla de precios?), P-25 (requiere criterio de ingeniería o de sector, no solo código), P-26 (cambio de contrato de API, coordinar despliegue backend+frontend).

### Producirán una mejora perceptible para el cliente final
P-01, P-02, P-03, P-06 (fase "este mes"), P-07 (fase "esta semana", dimensionamiento), P-08, P-09, P-10, P-11, P-12 (top 20), P-15, P-16, P-18, P-19, P-27, P-28. El resto (Redis, caché de JSON, fuente única de constantes, limpieza de código muerto, unificación de tipos, prefijos de API) mejora la solidez del producto pero no se nota en pantalla — son la base sobre la que las mejoras visibles dejan de ser frágiles.

---

## La pregunta de las dos semanas

*Si solo pudiéramos invertir dos semanas de trabajo, ¿qué cambios harían que un cliente percibiera el producto como significativamente más profesional, fiable y valioso?*

Con dos semanas haría, en este orden, exactamente los puntos 1 a 11 y 16 del top 20, más P-12 (conectar los incentivos fiscales) y P-16 (rango en vez de punto único en el simulador). Es una selección deliberada, no "todo lo urgente": cada uno de estos cambios corrige algo que un cliente puede descubrir por sí mismo sin que nadie se lo señale — un clic, una captura de pantalla, una comparación con su propia factura — y que una vez descubierto no se olvida.

Concretamente, dos semanas dan para:

1. **Una jornada** para las nueve correcciones de copy y contenido (P-01, P-02, P-03, P-04, P-08, P-09, P-11, P-15, P-21): son cambios de texto o borrados de contenido, sin riesgo, y son los que más pesan en la primera impresión.
2. **Dos o tres días** para los guards y avisos técnicos (P-05, P-06, P-07, P-10, P-18, P-20): cierran los casos en los que el producto podía mentir sin querer.
3. **El resto de las dos semanas** para las dos piezas de mayor esfuerzo pero mayor impacto perceptible: conectar los datos fiscales de las 16 comunidades que hoy están vacías (P-12) y mostrar un rango en vez de un número exacto en el simulador (P-16) — con revisión manual del contenido fiscal antes de publicarlo.

Con eso, un cliente que entre por primera vez encontraría: una promesa de acceso que se cumple, un producto que no presume de IA donde no la usa (y que si acaso la enseña donde de verdad la tiene, con Alertas BOE más visible), un informe de trámites sin restos de conversaciones internas del equipo que lo construyó, cifras que se presentan con la incertidumbre que realmente tienen, y una sección de incentivos fiscales que responde para su comunidad autónoma y no solo para Baleares. Ninguno de estos cambios toca el motor normativo, que ya es el activo más sólido del producto — y es precisamente por eso que vale la pena invertir las dos semanas en que el resto de la experiencia esté a la altura de lo que el motor normativo ya demuestra.
