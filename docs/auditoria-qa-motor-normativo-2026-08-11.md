# Auditoría QA — Motor normativo y flujo de clasificación

**Fecha:** 11 de agosto de 2026
**Commit auditado:** `ea01ad7`
**Alcance:** 17 CCAA × 5 tecnologías (85 ficheros de reglas, 258 reglas, 637 trámites), backend FastAPI, proxy Next.js y capa de presentación.
**Método:** análisis estático de los JSON, extracción automática de variables json-logic, barrido programático de 2.397 combinaciones + baterías dirigidas de casos límite, y comparación del contrato backend↔proxy↔UI.

> Todos los hallazgos de este informe están reproducidos ejecutando el código real del repositorio. Donde no he podido confirmar algo, lo indico explícitamente como *no verificado*.

---

## Resumen ejecutivo

| Severidad | Nº | Hallazgos |
|---|---|---|
| **Crítico** | 3 | C-01 contrato roto proxy↔motor (11 reglas inalcanzables), C-02 umbral RITE 5 kW incoherente entre CCAA, C-03 campos pedidos al usuario con justificación falsa |
| **Alto** | 4 | A-01 avisos contradictorios antes/después de clasificar, A-02 huecos de verificación ocultos justo donde más se confía, A-03 inscripción de oficio presentada como tarea con coste, A-05 validaciones pre-presentación solo en 4 de 17 CCAA |
| **Medio** | 7 | M-01 a M-07 (ver detalle) |
| **Bajo** | 5 | B-01 a B-05 (ver detalle) |
| ~~Alto~~ | 1 | **A-04 retirado: falso positivo** (ver su ficha) |

> **Corrección posterior (2026-08-11).** Al implementar las correcciones, la verificación normativa obligó a revisar dos hallazgos: **A-04 resultó ser un falso positivo** y **A-03 estaba mal diagnosticado**. Ambos derivaban de usar el número de trámites como indicador de si una comunidad modela un umbral, lo cual no es válido: una comunidad puede agrupar varios pasos en un trámite agregado. Las fichas correspondientes explican el error y lo que sí resultó verificable.

---

## Estado de las correcciones

Todos los hallazgos vigentes están corregidos. La suite pasa de 438 a **941 tests**; linter de coherencia sin hallazgos y `tsc --noEmit` limpio.

| Hallazgo | Estado | Commit |
|---|---|---|
| C-01 contrato proxy↔motor | Corregido en dos fases: constructor declarativo + campos en el formulario | `32f345e`, `0fb973e` |
| C-02 umbral RITE 5 kW | Unificado en las 17 CCAA, con base legal verificada en el BOE | `5247607` |
| C-03 textos falsos de superficie | Implementada la comprobación que prometían | `8cd9152` |
| A-01 avisos contradictorios | Criterio único en `lib/verificacion.ts` | `ac94526` |
| A-02 huecos ocultos | El banner ya no desaparece cuando hay huecos | `ac94526` |
| A-03 inscripción de oficio | Reformulado y corregido en Andalucía | `5de6307` |
| ~~A-04~~ | **Retirado: falso positivo** | `5de6307` |
| A-05 validador | 18 validaciones muertas revividas + panel honesto | `dc8dbf2` |
| M-01 conflicto de tensión | Comprobación simétrica | `d3cff27` |
| M-02 cotas del schema | `gt`/`ge` y `Literal` donde faltaban | `d3cff27` |
| M-03 conteo de trámites | `lib/tramites-conteo.ts` compartido | `eb4a39b` |
| M-04 "~0 días" | `null` cuando no hay estimación | `eb4a39b` |
| M-05 resumen incompleto | Pendiente (ver abajo) | — |
| M-06 `tipo_actuacion` por defecto | Corregido donde causaba daño (exenciones RITE) | `5247607` |
| M-07 peso visual del banner | Crítico pasa a paleta `danger` | `ac94526` |
| M-08 `revision_manual` como mensaje | 12 mensajes reescritos | `22048dc` |
| B-01 a B-06 | Cerrados | `22048dc` |

### Hallazgos encontrados *durante* la corrección

Cinco problemas que la auditoría no había detectado y que aparecieron al verificar o al arreglar:

1. **Galicia eximía del RITE a 5,0 kW exactos** (usaba `<= 5` para la exención y `> 5` para la memoria, dejando el valor frontera en el lado equivocado).
2. **Dos ramas muertas por valores imposibles**: `uso == "comercial"` y `combustible == "gas"`. La primera era la causa real de que Canarias devolviera 404 en gas terciario — no un hueco de cobertura, una errata. El linter ya detecta esta clase de error.
3. **Solapamiento en Cantabria**, introducido por mí al corregir el punto anterior sin mirar el contexto de esa comunidad: dos reglas disparaban a la vez y el plan pedía memoria técnica *y* proyecto. Detectado al verificar el resultado, no el diff.
4. **18 de las 26 validaciones eran código muerto** (A-05 resultó peor de lo reportado): Madrid y Cataluña usan formatos que el validador no implementaba, así que el panel decía "3 comprobaciones superadas" sin haber ejecutado ninguna.
5. **Los trámites informativos no se renderizaban** en ninguna sección: se filtraban fuera de los accionables y nadie los pintaba. Con la unificación del RITE eso habría dejado un plan aparentemente vacío en 16 comunidades.

### Lo que queda abierto

- **M-05** · el panel de resumen sigue sin mostrar `modalidad_autoconsumo`, `combustible` ni `presion_bar`, que son parámetros que deciden el plan. Es un cambio de UI sin riesgo normativo.
- **Aragón y Baleares · registro de autoconsumo.** Aragón no emite el trámite en ningún tramo; Baleares lo fusiona con el registro de producción. Separarlos exige una fuente autonómica específica que no he localizado: documentado como hueco en sus ficheros, no inventado.
- **RITE art. 15.1.c, segundo supuesto.** Quedan exentas las instalaciones de ACS por calentadores, acumuladores o termos eléctricos de hasta 70 kW. No se modela porque el formulario no pregunta el tipo de equipo generador. Anotado en los 13 ficheros de ACS afectados.
- **Cobertura del validador.** Sigue habiendo 60 de 85 combinaciones sin comprobaciones definidas. Ahora el panel lo dice explícitamente en vez de quedarse en blanco, pero completarlas requiere trabajo normativo por comunidad.

**Diagnóstico general.** El motor no se cae con ninguna combinación (0 crashes, 0 reglas con error de evaluación en 2.397 combinaciones) y la disciplina de honestidad normativa es sólida: no se inventan datos y los huecos están documentados. El problema no es de robustez, es de **integridad del contrato entre capas y de simetría entre comunidades**: hay reglas correctamente escritas que la aplicación real nunca puede activar, y hay normativa estatal idéntica implementada de tres formas distintas según la comunidad.

**El hallazgo con más impacto de negocio es C-01**: 9 variables que las reglas usan nunca salen del formulario, dejando fuera trámites de legionela, registro de producción y calificación territorial en 8 comunidades. Un usuario con una instalación afectada recibe un plan incompleto sin ningún aviso de que lo es.

---

## Hallazgos

### C-01 · CRÍTICO · El proxy `/api/clasificar` no envía 9 campos que las reglas sí usan

- **Comunidades afectadas:** Canarias, Madrid, Cataluña, Baleares, País Vasco, Castilla y León, Aragón, Andalucía
- **Tecnologías:** ACS, fotovoltaica, IRVE, gas
- **Ubicación:** `apps/web/app/api/clasificar/route.ts` (líneas 95-143) vs `apps/api/schemas/clasificador.py`

**Configuración utilizada / pasos para reproducir**

1. Formulario "Nueva instalación" → Canarias → fotovoltaica → 10 kW → residencial → BT → con excedentes con compensación.
2. El proxy construye el `body` del `fetch` a mano, campo a campo. `instalacion_origen_modificada` no está en esa lista.
3. json-logic evalúa la variable ausente como *falsy*, así que la rama "instalación no modificada" siempre gana silenciosamente.

**Resultado observado**

```
                                              SIN el campo (= proxy real)   CON el campo
Canarias FV — instalación de origen modificada    ICAN-FV-001                ICAN-FV-001B      ← se pierde
Canarias FV — implantación en suelo               ICAN-FV-001                + ICAN-FV-CALIF-TERRITORIAL
Baleares ACS — uso colectivo (legionela)          BAL-ACS-001                + BAL-ACS-003
País Vasco ACS — uso colectivo                    PV-ACS-001                 + PV-ACS-003
Castilla y León ACS — uso colectivo               CYL-ACS-001                + CYL-ACS-003
Aragón ACS — uso colectivo                        ARA-ACS-001                + ARA-ACS-003
Madrid ACS — ámbito RD 487/2022                   MAD-ACS-MTD                + MAD-ACS-LEGIONELLA
Canarias ACS — ámbito RD 487/2022                 ICAN-ACS-001               + ICAN-ACS-LEGIONELLA
Madrid FV — registro de producción                (2 reglas)                 + MAD-FV-REGISTRO-PRODUCCION
Cataluña FV — RIPRE                               (2 reglas)                 + CAT-FV-RIPRE
Cataluña IRVE — 25 suministros                    CAT-IRVE-MTD               + CAT-IRVE-INSPECCION-INICIAL-VERIFICAR
```

11 de 14 casos dirigidos pierden reglas. Trámites que desaparecen del plan sin dejar rastro:

- Plan de Prevención y Control de la Legionelosis + notificación/censo sanitario (Baleares, País Vasco, Castilla y León, Aragón, Madrid, Canarias)
- Calificación Territorial ante el Cabildo insular (Canarias, fotovoltaica en suelo)
- Inscripción en el Registro de Producción de Energía Eléctrica (Madrid, Cataluña)
- Revisión de inspección inicial por organismo de control en edificios ≥20 suministros (Cataluña)

**Variables huérfanas completas** (usadas por reglas, nunca enviadas):

| Variable | Nº condiciones | CCAA |
|---|---|---|
| `instalacion_origen_modificada` | 6 | canarias |
| `uso_colectivo` | 5 | andalucia, aragon, baleares, castilla_leon, pais_vasco |
| `clase_instalacion_gas` | 4 | cataluna, madrid |
| `incluida_ambito_rd_487_2022` | 2 | canarias, madrid |
| `requiere_registro_produccion` | 2 | cataluna, madrid |
| `recirculacion` | 1 | andalucia |
| `acumulacion` | 1 | andalucia |
| `implantacion` | 1 | canarias |
| `numero_suministros_edificio` | 1 | cataluna |

**Resultado esperado.** O el formulario recoge y envía esos campos, o las reglas que dependen de ellos se marcan como no aplicables y el plan avisa de que hay ramas normativas sin evaluar. Lo que no debe pasar es que la rama negativa gane por defecto sin que nadie lo sepa.

**Evidencia.** Extracción automática de todos los `{"var": ...}` de las 258 reglas y las 26 validaciones, cruzada con la lista literal de campos del `body` del proxy. Confirmación empírica ejecutando el clasificador con y sin cada campo.

**Nota de causa raíz.** El proxy enumera campos a mano en vez de reenviar el `FormState` completo. Cada campo nuevo del motor exige acordarse de tocar este fichero, y no hay ninguna prueba que lo detecte.

---

### C-02 · CRÍTICO · El umbral RITE de 5 kW está implementado de tres formas distintas

- **Comunidades afectadas:** las 17 (comportamiento divergente)
- **Tecnologías:** ACS, climatización/aerotermia
- **Ubicación:** `apps/api/motor_normativo/reglas/*/acs.json` y `*/climatizacion_aerotermia.json`

**Configuración:** ACS, 4,99 kW, uso residencial, misma entrada en las 17 comunidades.

El RD 1027/2007 (RITE) es normativa **estatal**: por debajo de 5 kW no hay obligación de documentación ni registro. La misma entrada produce tres resultados incompatibles:

| Comportamiento | CCAA | Qué ve el usuario |
|---|---|---|
| 0 trámites + advertencia de exención | Aragón | "Instalación exenta" |
| 1 trámite `informativa` | Cataluña, Madrid | "No requiere registro documental RITE" |
| 1 trámite `accion_usuario` que en realidad es informativo | Canarias, Castilla y León, Galicia | Aparece como tarea pendiente aunque el texto diga "sin trámite obligatorio" |
| **2 trámites reales (MTD + registro)** | **Andalucía, Asturias, Baleares, Cantabria, Castilla-La Mancha, C. Valenciana, Extremadura, La Rioja, Murcia, Navarra, País Vasco** | **Se le exige papeleo del que la norma le exime** |

**Resultado observado (4,99 kW, ACS):**
```
aragon                 (0 trámites)
madrid                 [informativa] Información: no requiere registro documental RITE por razón de potencia
cataluna               [informativa] Información: no requiere presentación documental de …
castilla_leon          [accion_usuario] Sin trámite obligatorio ante la Administración (inst…
galicia                [accion_usuario] Ejecución por instalador habilitado (sin comunicación…
extremadura            [accion_usuario] Memoria Técnica de Diseño (MTD) … | [accion_usuario] Registro de instalación térmica
navarra                [accion_usuario] Memoria Técnica de Diseño (MTD) … | [accion_usuario] Registro/comunicación de puesta en servicio
… (9 CCAA más igual)
```

**Resultado esperado.** Un umbral estatal debe producir la misma decisión en las 17 comunidades. Las diferencias legítimas son las autonómicas (qué plataforma, qué tasa, qué plazo), no si existe o no la obligación.

**Impacto.** 11 comunidades sobre-exigen trámites. Si el producto se vende como "te decimos exactamente qué trámites necesitas", esto es un error de negocio directo, no cosmético.

---

### C-03 · CRÍTICO · Se piden datos al usuario con una justificación que el código desmiente

- **Comunidades afectadas:** todas
- **Tecnologías:** fotovoltaica, climatización/aerotermia
- **Ubicación:** `apps/web/components/nueva-instalacion/Step2ParametrosTecnicos.tsx:79` y `:499`

**Pasos para reproducir**

1. Nueva instalación → fotovoltaica. El campo "Superficie del generador (m²)" dice: *"Opcional. Se usa para verificar la coherencia con la potencia."*
2. Nueva instalación → climatización. El campo "Superficie climatizada (m²)" dice: *"Necesaria para clasificar si aplica RITE completo."*
3. Introducir 1 m² con 100 kW y clasificar.

**Resultado observado**

- El plan se genera sin ninguna incidencia: `superficie 1 m2 con 100 kW → ACEPTADO -> 2 trámites`.
- `superficie_m2` **no aparece en el body** que el proxy envía al motor (`route.ts:95-143`).
- **Ninguna** de las 258 reglas ni de las 26 validaciones referencia `superficie_m2`.

**Resultado esperado.** O se implementa la comprobación de coherencia potencia/superficie que el texto promete, o se corrige el texto. Decirle al usuario que un dato es "necesario para clasificar" cuando se descarta antes de llegar al motor erosiona la confianza en todo lo demás que dice la aplicación.

**Nota.** Es el mismo patrón que ya se corrigió en el simulador con el código postal. Conviene barrer todos los `hint` del formulario con este criterio.

---

### A-01 · ALTO · El mismo dato produce avisos contradictorios antes y después de clasificar

- **Comunidades afectadas:** Aragón (4 verticales), Asturias (5 verticales) — 9 de 85 combinaciones
- **Ubicación:** `apps/web/components/nueva-instalacion/types.ts:127` (`nivelCobertura`) vs `apps/web/types/plan.ts:102` (`severidadVerificacion`)

Las dos funciones evalúan los mismos dos campos (`nivel_verificacion`, `estado`) pero **con el orden de los condicionales invertido**:

```
nivelCobertura       (ANTES): no_verificado → verificada → parcial → generica_grave
severidadVerificacion (DESPUÉS): no_verificado → generica → parcial → ninguno
                                                 ^^^^^^^ adelantado
```

**Pasos para reproducir.** Nueva instalación → Asturias → ACS (`nivel_verificacion: "generica"`, `estado: "verificado_parcialmente"`).

**Resultado observado**

- Paso 1: aviso de nivel **atención** — "verificado parcialmente".
- Tras clasificar: banner **crítico** — *"Normativa genérica (sin verificación autonómica)"*.

**Resultado esperado.** Un único criterio compartido. Además, el docstring de `ClasificadorOutput.estado` dice que `estado` *"debe primar sobre nivel_verificacion"*, pero la implementación solo deja que prime **para agravar** (`includes("no_verificado")`), nunca para atenuar. Aragón y Asturias fueron verificadas parcialmente y la app las etiqueta como sin verificar.

**Recomendación.** Extraer la lógica a un único módulo compartido y añadir un test de tabla que recorra las 85 combinaciones comprobando que ambas fases coinciden.

---

### A-02 · ALTO · Los huecos de verificación se ocultan precisamente en el plan más "fiable"

- **Comunidad afectada:** Andalucía
- **Tecnología:** ACS
- **Ubicación:** `apps/web/components/plan-tramitacion/PlanTramitacionView.tsx:102-154`

**Pasos para reproducir.** Clasificar Andalucía / ACS. Es la única combinación de las 85 con `nivel_verificacion: "verificada"` y `estado: null`.

**Resultado observado.** `severidadVerificacion` devuelve `"ninguno"` → `VerificacionBanner` hace `return null` → **los 8 `huecos_verificacion` documentados en `andalucia/acs.json` no se muestran nunca**. El único plan que la app presenta como plenamente verificado es el único cuyos huecos quedan invisibles.

**Resultado esperado.** Los huecos deben renderizarse siempre que existan, con independencia del nivel de verificación global; como mucho, con estilo más discreto cuando el nivel sea "verificada".

---

### A-03 · ALTO · La inscripción de oficio en el registro de autoconsumo se presenta como tarea del usuario

> **Reformulado el 2026-08-11 tras verificar la normativa.** El enunciado original de este hallazgo era *"el umbral de 100 kW no está modelado en Andalucía, Aragón y Baleares"*, deducido de que el número de trámites no cambiaba al cruzar los 100 kW. Ese diagnóstico era **incorrecto**: contar trámites no mide si un umbral está modelado, y en el caso de Andalucía el umbral relevante de autorización administrativa no son 100 kW sino 500 kW, por el **Decreto-ley 2/2018 andaluz** (disposición adicional única), que ya estaba verificado y citado en las fuentes del fichero. Cambiarlo a 100 kW habría introducido un error. Lo que sí resulta verificable se describe a continuación.

- **Comunidades afectadas:** Andalucía (corregido); Aragón y Baleares (documentado, no corregido)
- **Tecnología:** fotovoltaica autoconsumo

**Base legal.** Art. 9.4 de la Ley 24/2013 del Sector Eléctrico, en la redacción del RDL 15/2018, citado literalmente en el manual de tramitación de autoconsumo de la Secretaría General de Industria, Energía y Minas de la Junta de Andalucía (ap. 5.1.7 y 5.2.7):

> "Para aquellos sujetos consumidores conectados a baja tensión, en los que la instalación generadora sea de baja tensión y la potencia instalada de generación sea menor de 100 kW que realicen autoconsumo, la inscripción se llevará a cabo **de oficio** por las Comunidades Autónomas [...]. Para el resto de instalaciones [...] con potencias mayores de 100 kW o aquellas que no sean en BT tendrán que **presentar solicitud de inscripción**."

Es una obligación de la Administración, no del ciudadano, así que no admite especialidad autonómica.

**Resultado observado.** En Andalucía, el trámite "Inscripción en el RADNE" se emitía sin `tipo_actuacion` —es decir, como acción del usuario— en todo el rango, con **62,25 € de coste estimado** y un formulario del MITECO que rellenar. Lo llamativo: el propio campo `organismo` del trámite ya decía *"(inscripción de oficio en BT <100 kW)"*. El conocimiento estaba en la prosa y no en la estructura, así que la interfaz no podía distinguirlo y lo contaba como tarea pendiente con coste.

**Resultado esperado.** Por debajo de 100 kW con consumo y generación en BT: trámite de oficio, sin coste, sin formulario y sin contar como tarea. Igual o por encima de 100 kW, o en AT: solicitud del titular. Madrid ya lo modelaba así.

**Aragón y Baleares.** Aragón no emite ningún trámite de registro de autoconsumo, y Baleares lo fusiona con el registro de producción en un único trámite. Separarlos sin una fuente autonómica que lo respalde sería inventar normativa, así que quedan documentados como huecos en sus ficheros.

---

### A-04 · ~~ALTO~~ · FALSO POSITIVO — retirado

> **Retirado el 2026-08-11.** El enunciado original era *"Comunidad Valenciana devuelve el mismo plan de 0,5 kW a 500 kW"*. Es falso. Al inspeccionar las reglas, C. Valenciana **sí modela los umbrales**: CV-FV-001 (≤10 kW), CV-FV-002 (10–100 kW), CV-FV-003 (100–500 kW) y CV-FV-004 (>500 kW), además de tramos por importe de inversión.
>
> El error fue de método: usé el **número de trámites** como indicador de si una comunidad diferencia por potencia. C. Valenciana agrupa cada tramo en un único trámite agregado ("Comunicación de puesta en servicio e inscripción"), así que el contador no varía aunque el trámite emitido sea distinto en cada tramo. Es una diferencia de granularidad de modelado, no una ausencia de umbral.
>
> El mismo defecto de método afecta a los "perfiles planos" que citaba el hallazgo (Asturias, Baleares, Canarias, Madrid): antes de concluir que falta un umbral hay que mirar qué trámite se emite, no cuántos.
>
> **Lección aplicable al resto del informe:** las métricas agregadas sirven para *localizar* dónde mirar, no para concluir. Todo hallazgo derivado de un conteo debe confirmarse leyendo las reglas.

---

### A-05 · ALTO · El validador pre-presentación solo existe en 3 de 17 comunidades

- **Ubicación:** clave `validaciones` en los JSON; `apps/api/motor_normativo/validador.py`

**Resultado observado.** 26 validaciones en total, repartidas así:

| CCAA | ACS | Clima | FV | Gas | IRVE |
|---|---|---|---|---|---|
| Andalucía | 2 | – | 2 | – | 3 |
| Aragón | – | – | – | – | 1 |
| Cataluña | 2 | 1 | 3 | 3 | 2 |
| Madrid | 1 | 1 | 1 | 3 | 1 |
| **Otras 13 CCAA** | – | – | – | – | – |

**60 de 85 combinaciones (71 %) tienen cero validaciones.** El `ValidadorPanel` sí distingue el caso (`total_definidas === 0`), lo cual es correcto y honesto — no marca falsos "todo OK". Pero funcionalmente el validador es una característica que solo funciona en 4 comunidades y se presenta en la UI como si fuera general.

**Resultado esperado.** O se completa la cobertura, o la pestaña "Validación" indica de forma visible que esa comunidad todavía no tiene comprobaciones definidas (no solo un texto dentro del panel).

---

### M-01 · MEDIO · La detección de conflicto de tensión solo funciona en un sentido

- **Ubicación:** `apps/api/motor_normativo/clasificador.py:79-98`

| Entrada | Resultado |
|---|---|
| `tension="BT"` + `nivel_tension_generacion="at"` | Detectado → revisión manual ✔ |
| `tension="BT"` + `nivel_tension_conexion="at"` | Rechazado en el schema ✔ |
| **`tension="AT"` + `nivel_tension_consumidor="bt"`** | **Aceptado en silencio → plan de AT** ✘ |

La comprobación `any(nivel == "at")` vive dentro de la rama `elif tension == "bt"`. La rama `at` solo rellena `nivel_tension_conexion` y no valida nada. Un consumidor en BT con generación en BT declarado como AT recibe el plan de alta tensión (autorización administrativa) sin ningún aviso.

---

### M-02 · MEDIO · Parámetros numéricos sin cota inferior ni coherencia cruzada

- **Ubicación:** `apps/api/schemas/clasificador.py:36-60`

Aceptado sin error en el barrido de configuraciones imposibles:

| Entrada | Resultado |
|---|---|
| `potencia_kw = 0` | Plan completo de 2 trámites |
| `numero_puntos = 0` y `= -3` | Plan IRVE normal |
| `inversion_eur = -1000` y `= 1e12` | Plan normal |
| `modo_recarga = "9"` (solo existen 1–4) | Plan normal |
| **`presion_operacion_bar = -1`** | **Plan de 1 trámite en vez de 2 — desaparece el proyecto técnico** |
| `numero_puntos=2 × 7,4 kW` con `potencia_kw=1000` | Sin aviso de incoherencia |
| `uso = "marciano"` / `uso = ""` | Plan normal (es `str` libre, no `Literal`) |

El caso de la presión negativa es el más serio: un signo cambiado **relaja** los requisitos en vez de bloquear. `uso` es especialmente sensible porque las reglas ramifican sobre él, así que una errata cambia el plan en silencio.

**Recomendación.** `ge=0` en `numero_puntos` e `inversion_eur`, `gt=0` en `potencia_kw`, `Literal` para `uso` y `modo_recarga`, y un validador de coherencia potencia ↔ Σ(puntos × potencia por punto) y potencia ↔ superficie.

---

### M-03 · MEDIO · El panel lateral y la línea temporal cuentan trámites distintos

- **Ubicación:** `ResumenPanel.tsx:87-89` vs `TimelinePlan.tsx` y `clasificador.py:246`

El contador lateral usa solo `accion_usuario`; la línea temporal dibuja `plan.tramites` completo; `tiempo_total_estimado_dias` suma **todos** los trámites, incluidos los de oficio e informativos.

**Reproducción:** Madrid / fotovoltaica / 20 kW / BT → el panel dice "1 trámite", la línea temporal dibuja 2 barras, y los días mostrados corresponden a los 2.

---

### M-04 · MEDIO · 11 combinaciones muestran "~0 días estimados"

- **Comunidades afectadas:** Cataluña (5 verticales), Madrid (5), C. Valenciana (1)

65 de 637 trámites (10 %) no tienen `plazo_estimado_dias`. Cuando ninguno del plan lo tiene, `tiempo_total_estimado_dias = 0` y el panel muestra un rotundo **"~0 días estimados"**, que se lee como "trámite inmediato" en vez de "no lo sabemos".

Concentración: Cataluña 29 trámites sin plazo, Madrid 24.

**Recomendación.** Distinguir `0` de `None` y mostrar "sin estimación disponible".

---

### M-05 · MEDIO · El resumen omite los parámetros que decidieron el plan

- **Ubicación:** `ResumenPanel.tsx:9-39` (`CAMPOS_VISIBLES_POR_TIPO`)

No se muestran, pese a gobernar las reglas: `modalidad_autoconsumo` (fotovoltaica), `combustible` y `presion_bar` (gas), `uso` (IRVE). En cambio se declara visible `tension` para IRVE, campo que el formulario de IRVE no recoge y por tanto nunca aparece.

El usuario no puede auditar por qué obtuvo ese plan concreto.

---

### M-06 · MEDIO · 582 de 637 trámites heredan `tipo_actuacion` por defecto

Solo 55 trámites declaran `tipo_actuacion`. El resto cae en `accion_usuario` por el `else` de `clasificador.py:213-218`. Consecuencia visible en C-02: trámites cuyo texto dice "sin trámite obligatorio" se presentan como tareas accionables, entran en el contador de progreso y distorsionan el porcentaje de avance del expediente.

Además la excepción histórica está *hardcodeada* a una única regla: `if regla.get("id") in ["MAD-FV-REGISTRO-OFICIO"]`.

---

### M-07 · MEDIO · El banner "crítico" y el "de atención" tienen casi el mismo peso visual

- **Ubicación:** `PlanTramitacionView.tsx:109-112`

`critico` usa `border-warning/30 bg-warning-light`; `atencion` usa `border-primary/20 bg-primary-light`. Ambos son avisos suaves; ninguno usa la paleta `danger` que sí existe en el sistema de diseño. Dado que **74 de 85 combinaciones son `generica`** y **61 de 85 son `borrador_no_verificado`**, prácticamente todos los planes muestran el banner crítico: el resultado es fatiga de alerta y un "crítico" que no se distingue de un informativo.

---

### B-01 · BAJO · Claves de JSON sin consumidor

- `verificacion_2026_07_28` — aparece en 1 fichero, ningún código la lee.
- `nivel_verificacion_regla` — en 3 reglas, ningún código la lee.
- `registro_salida` y `medio_presentacion` — presentes en 9 trámites y expuestos en `TramiteOutput`, pero **no figuran en `apps/web/types/plan.ts::Tramite`** ni se renderizan.

### B-02 · BAJO · Campo `formulario_ref` ausente (no nulo) en 83 trámites

554 de 637 trámites tienen la clave; 83 no la tienen en absoluto. El clasificador usa `.get()` y no falla, pero impide distinguir "no investigado" de "investigado y no existe". Conviene normalizar a `null` explícito.

### B-03 · BAJO · 12 trámites declaran `plataforma` sin `plataforma_url`

El badge de plataforma se muestra sin enlace. La relación inversa (URL sin plataforma) no ocurre: 0 casos.

### B-04 · BAJO · 22 trámites sin documentos requeridos

3 % del total. Alimentan el indicador de riesgo normativo, así que el efecto está contenido, pero son trámites sobre los que no se puede generar checklist ni validar documentación.

### B-05 · BAJO · Función deprecada aún exportada

`tieneCobertura()` en `types.ts:146` está marcada `@deprecated` y devuelve `true` solo para Andalucía/ACS. Si algún consumidor la usara como puerta de acceso, bloquearía 84 de 85 combinaciones.

---

## Cobertura analizada

**Comunidades revisadas:** 17/17 — las 17 tienen los 5 ficheros. Ninguna comunidad falta ni está desactivada.

**Tecnologías revisadas:** 5/5 (fotovoltaica autoconsumo, IRVE, climatización/aerotermia, ACS, gas baja presión). El enum `TipoInstalacion` y el árbol de ficheros coinciden exactamente: 85 combinaciones, sin huérfanos en ninguna dirección.

**Combinaciones exploradas**

| Barrido | Nº |
|---|---|
| Matriz principal (17 CCAA × 5 tec. × potencias frontera × 3 usos) | 2.397 |
| Batería de configuraciones imposibles | 26 |
| Comprobación de umbrales RITE 5 kW y 70 kW | 136 |
| Comprobación de umbrales FV 15/100 kW | 136 |
| Reachability dirigida de variables huérfanas | 28 |
| **Total ejecutado** | **~2.720** |

Resultado del barrido principal: **2.369 OK · 16 sin normativa · 12 plan vacío · 0 crashes · 0 reglas con error de evaluación**.

- Los 16 "sin normativa" son Canarias/gas en uso industrial y terciario, hueco **documentado** en `huecos_verificacion`. Comportamiento correcto: 404 honesto en vez de dato inventado.
- Los 12 "plan vacío" son Aragón ACS y climatización por debajo de 5 kW, con la advertencia explícita de exención. Correcto (y es la implementación que C-02 propone generalizar).

**Reglas identificadas:** 258 reglas, 637 trámites, 26 validaciones. Variables json-logic distintas en uso: 40, de las cuales 9 son inalcanzables desde la aplicación (C-01) y 1 (`tension`) se envía sin que ninguna regla la use.

**Mensajes analizados**

| Mensaje | Cuándo aparece | Veredicto |
|---|---|---|
| "El tiempo total es orientativo y asume trámites en serie" | Siempre | Correcto. Bien separado visualmente del resto de advertencias |
| "No se ha encontrado ningún trámite aplicable… está exenta" | Regla casa con 0 trámites | Correcto y necesario: distingue exención de plan roto |
| "N regla(s) no se pudieron evaluar" | Excepción en json-logic | Correcto. **No se disparó ni una vez** en 2.720 ejecuciones |
| "No hay normativa verificada para esta combinación…" (404) | Ninguna regla casa | Correcto y honesto; remite a `huecos_verificacion` |
| "Normativa genérica (sin verificación autonómica)" | `nivel_verificacion === "generica"` | **Contradice el aviso previo** en 9 combos (A-01) |
| "Borrador no verificado" | `estado` contiene `no_verificado` | Correcto, pero se muestra en 61/85 → fatiga (M-07) |
| "Verificado" (sin banner) | Andalucía/ACS | **Oculta 8 huecos documentados** (A-02) |
| "~0 días estimados" | `tiempo_total = 0` | **Engañoso** en 11 combos (M-04) |
| "N trámites" (panel lateral) | Siempre | **No coincide** con la línea temporal (M-03) |
| "Se usa para verificar la coherencia con la potencia" | Campo superficie | **Falso** (C-03) |
| "Necesaria para clasificar si aplica RITE completo" | Campo superficie | **Falso** (C-03) |
| "Sin validaciones definidas" | `total_definidas === 0` | Correcto y honesto, pero aplica al 71 % de casos (A-05) |
| `revision_manual` como mensaje de error | Validador de Cataluña | Ver M-08 abajo |

**Nota adicional (M-08, medio).** Las validaciones de Cataluña lanzan `ValueError("revision_manual")`, que es un *código interno*, no un mensaje. El proxy lo limpia (`stringifyErrorDetail` quita el prefijo "Value error,") pero el usuario acaba viendo literalmente `modalidad_autoconsumo: revision_manual`. Madrid, en el mismo punto, sí usa mensajes legibles ("potencia_resultante_kw is required for gas installations" — aunque en inglés, ver B-06). El schema de Zod del frontend sí traduce estas condiciones a castellano, así que el usuario solo ve el código interno si envía por API o si el espejo Zod se desincroniza.

**Nota adicional (B-06, bajo).** Los mensajes de validación de Madrid están en inglés dentro de una aplicación íntegramente en castellano.

---

## Inconsistencias detectadas

Ordenadas por qué componente parece ser la fuente del problema:

1. **Fuente: el proxy Next.js** (`app/api/clasificar/route.ts`). Enumera campos a mano y se ha quedado 9 campos por detrás del schema del backend. Es la causa raíz de C-01 y contribuye a C-03. Es el punto único de fallo más rentable de arreglar.

2. **Fuente: duplicación de lógica de severidad.** `nivelCobertura` y `severidadVerificacion` son la misma regla escrita dos veces con distinto orden. A-01 es consecuencia directa. El propio docstring del backend describe una semántica ("`estado` prima") que ninguna de las dos implementa del todo.

3. **Fuente: los JSON de normativa, por falta de un criterio común para umbrales estatales.** C-02, A-03 y A-04 comparten patrón: cada comunidad se escribió por separado y nadie comparó los umbrales de origen estatal entre ellas. El linter existente (`lint.py`) valida coherencia *interna* de cada fichero pero no *transversal* entre comunidades.

4. **Fuente: el schema Pydantic**, que trata como opcionales y sin cota campos que el dominio sí acota (M-02). El validador `validate_inputs_by_ca` solo cubre Madrid y Cataluña; las 15 restantes no tienen validación de entrada específica.

5. **Fuente: la capa de presentación**, que aplica tres criterios distintos de "qué es un trámite" (todos / accionables / accionables+oficio) según el componente (M-03).

**Contradicción explícita entre componentes.** El docstring de `ClasificadorOutput.estado` afirma que `estado` *"debe primar sobre `nivel_verificacion` de cara al usuario"*. Ninguna de las dos implementaciones de frontend lo cumple: solo dejan que `estado` prime para agravar. La documentación describe un comportamiento que el código no tiene — y en Aragón y Asturias la diferencia es visible.

---

## Recomendaciones prioritarias

**P0 — antes de cualquier uso en producción**

1. **Reenviar el `FormState` completo desde el proxy** en vez de enumerar campos, y añadir un test que compare las claves del `body` con los campos de `ClasificadorInput`. Cierra C-01 de raíz y evita que vuelva a pasar.
2. **Recoger en el formulario los 9 campos huérfanos**, condicionados a tecnología y comunidad (solo Canarias necesita `implantacion`; solo ACS necesita `uso_colectivo`). Mientras no se recojan, añadir una advertencia explícita al plan indicando qué ramas normativas no se han evaluado.
3. **Corregir los dos textos falsos del campo superficie** (C-03) y barrer el resto de `hint` del formulario con el mismo criterio.

**P1 — siguiente iteración**

4. **Unificar el umbral RITE de 5 kW** en las 17 comunidades, siguiendo el patrón de Aragón (0 trámites + advertencia) o el de Madrid/Cataluña (1 trámite `informativa`). Elegir uno y aplicarlo.
5. **Extraer la lógica de severidad a un módulo compartido** y añadir un test de tabla sobre las 85 combinaciones que verifique coincidencia entre fases.
6. **Renderizar `huecos_verificacion` siempre**, también con nivel "verificada" (A-02).
7. **Modelar el umbral de 100 kW** en Andalucía, Aragón y Baleares (A-03) y revisar el perfil plano de C. Valenciana (A-04).

**P2 — endurecimiento**

8. Cotas y `Literal` en el schema: `gt=0` en `potencia_kw`, `ge=0` en `numero_puntos`, `inversion_eur` y `presion_operacion_bar`; `Literal` en `uso` y `modo_recarga` (M-02).
9. Simetrizar la detección de conflicto de tensión (M-01).
10. Unificar el criterio de conteo de trámites entre panel, línea temporal y suma de días (M-03), y distinguir `0` de "sin estimación" (M-04).
11. **Extender `lint.py` con reglas transversales entre comunidades**: mismo umbral estatal → mismo comportamiento; toda variable usada en una regla debe ser enviable desde el formulario. Esto convierte C-01, C-02 y A-03 en fallos de CI en lugar de hallazgos de auditoría.

---

## Casos de prueba adicionales propuestos

**Contrato entre capas**

1. Test que extrae las claves del `body` de `route.ts` y las compara con los campos de `ClasificadorInput`; falla si el proxy omite alguno que alguna regla use.
2. Test de reachability: para cada una de las 258 reglas, verificar que existe al menos una entrada construible desde el formulario que la active.
3. Test que compruebe que toda variable json-logic pertenece al schema (detecta erratas en nombres de variable, que hoy se evalúan como `falsy` sin avisar).

**Coherencia entre comunidades**

4. Test parametrizado del umbral RITE 5 kW sobre las 17 CCAA: mismo veredicto de exención.
5. Test parametrizado del umbral 100 kW en fotovoltaica: el plan debe cambiar al cruzarlo en las 17.
6. Test de monotonía: a mayor potencia, el número de trámites no debe decrecer (detecta perfiles planos y ramas invertidas).

**Coherencia de fases**

7. Test de tabla sobre las 85 combinaciones: `nivelCobertura` y `severidadVerificacion` deben coincidir en severidad.
8. Test de que `huecos_verificacion` no vacío implica que se renderiza.

**Entradas límite**

9. Propiedad: ninguna entrada con un valor negativo debe producir un plan con *menos* trámites que la misma entrada en positivo (habría cazado el caso de la presión negativa).
10. Test de coherencia cruzada: `potencia_kw` vs `Σ(numero_puntos × potencia_por_punto_kw)` y `potencia_kw` vs `superficie_m2`.
11. Fuzzing sobre `uso`, `modo_recarga` y `combustible` con valores fuera de dominio: debe rechazarse, no ramificar en silencio.
12. Test de las 4 combinaciones de tensión (BT/AT × consumidor/generación/conexión) verificando simetría en la detección de conflictos.

**Presentación**

13. Snapshot de que el contador del panel, el número de barras de la línea temporal y el denominador del progreso usan el mismo conjunto de trámites.
14. Test de que `tiempo_total_estimado_dias === 0` con trámites presentes nunca renderiza "~0 días".

---

## Anexo · Qué está bien y conviene no romper

En una auditoría es fácil perder de vista lo que funciona. Estos puntos son sólidos y varios de ellos son poco habituales:

- **Cero crashes y cero errores de evaluación** en ~2.720 combinaciones, incluidas entradas deliberadamente absurdas.
- **El 404 de "sin normativa verificada" es honesto**: no rellena huecos con datos inventados y remite explícitamente a `huecos_verificacion`. Es la decisión correcta para un producto de cumplimiento normativo.
- **La advertencia de plan vacío por exención** distingue "exento" de "roto", que en la UI serían indistinguibles.
- **`stringifyErrorDetail`** en el proxy es defensa en profundidad bien hecha: el frontend nunca recibirá un `[object Object]`.
- **El validador y el indicador de riesgo normativo declaran sus límites** en el propio código ("no es una probabilidad de rechazo: no existe histórico con el que entrenar un modelo"). Esa contención es difícil de mantener y conviene preservarla.
- **`ValidadorPanel` distingue "cero validaciones definidas" de "cero incidencias"**, evitando el falso positivo tranquilizador.
- **`cobertura_normativa.ts` se genera desde los JSON** en vez de mantenerse a mano, con la advertencia de "no editar" en cabecera.
- **Defensa contra path traversal** en `clasificador.py` pese a que el enum ya lo impide.
