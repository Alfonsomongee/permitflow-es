# Auditoría integral de producto

**Fecha:** 11 de agosto de 2026
**Perspectivas aplicadas:** QA, arquitectura, producto, análisis de negocio, desarrollo full stack y UX.

## Alcance y honestidad sobre el método

Esta auditoría se centra en **lo que no cubrían las dos anteriores**, que no repito:

- `docs/auditoria-qa-motor-normativo-2026-08-11.md` — motor normativo, reglas, contrato de datos, validador.
- `docs/auditoria-ux-ui-2026-08-11.md` — sistema de diseño, landing, componentes.

Aquí se audita: **modelos y cálculos económicos**, **estructura y valor de cada sección**, **flujos, enlaces y errores silenciosos**, y **arquitectura de la capa de cálculo**.

**Lo que no he podido verificar, y conviene que conste:** no he ejecutado la aplicación en un navegador ni contra la base de datos de producción. No hay, por tanto, verificación de condiciones de carrera reales, rendimiento bajo carga, comportamiento de RLS con datos reales ni pruebas de regresión visual. Todo lo que afirmo se apoya en lectura de código y en cálculos que he ejecutado; donde infiero, lo digo.

---

# Resumen Ejecutivo

## Estado general del producto

**El producto tiene un núcleo sólido y una capa económica que no está a su altura.**

El motor normativo —tras las correcciones de esta semana— es riguroso: cita base legal por trámite, distingue lo verificado de lo que no, y tiene 1.223 tests. Esa es la parte difícil y está bien hecha.

La capa de cálculo económico, en cambio, **presenta cifras de inversión con una precisión que no tiene**, y contiene el hallazgo más llamativo de esta auditoría: existe un modelo de proyección económica correcto, con tests, que **no se usa en ninguna parte**; lo que el usuario ve es una multiplicación lineal.

## Calidad percibida

| Dimensión | Observación |
|---|---|
| Higiene de código | Alta. 55 de 55 botones tienen acción, cero enlaces internos rotos, solo 2 `catch` silenciosos y ambos acotados. |
| Disciplina de datos | Alta en normativa, **baja en constantes de mercado** (duplicadas en dos ficheros con sincronización manual). |
| Honestidad del producto | Alta donde hay normativa, **insuficiente donde hay dinero**: los supuestos existen en el backend pero no siempre llegan a la pantalla. |
| Coherencia entre secciones | Media. Dos secciones calculan lo mismo con presentaciones incompatibles. |

## Riesgos principales

1. **Riesgo de decisión de inversión.** Un cliente puede decidir una compra de 5–10 k€ con un payback y un ahorro a 10 años calculados de forma simplista, sin ver la horquilla de incertidumbre.
2. **Riesgo de credibilidad técnica.** Si un instalador compara la horquilla de «Orientación» con el punto único del «Simulador», verá dos respuestas para la misma pregunta.
3. **Riesgo de dato caducado.** El precio de la electricidad es de S1-2025 y el propio comentario del código dice que ya se conoce un valor más reciente y superior.

---

# Hallazgos Críticos

### I-01 · El modelo de proyección económica existe, está testeado y no se usa

- **Severidad:** Crítica
- **Impacto para el usuario:** El «ahorro a 10 años» que se muestra es `ahorro_anual × 10`. No modela degradación del panel, ni subida del precio de la electricidad, ni mantenimiento. Es la cifra sobre la que un cliente decide una inversión de miles de euros.

**Evidencia.** `apps/web/lib/calculations/economic-projection.ts` implementa `calculateSavingsProjection`, que sí modela los tres factores, con validación de rangos y 12 tests en `economic-projection.test.ts`. Búsqueda de usos en todo el frontend:

```
grep -rn "calculateSavingsProjection" apps/web --include=*.tsx --include=*.ts | grep -v test
→ apps/web/lib/calculations/economic-projection.ts:60   (solo su propia definición)
```

Lo que sí se renderiza viene de `apps/api/servicios/calculo_financiero.py:261-262`:

```python
ahorro_5_anios=_redondear(ahorro_anual * 5, 2),
ahorro_10_anios=_redondear(ahorro_anual * 10, 2),
```

Y se pinta en `apps/web/components/simulador/informe-interactivo.tsx:24-25`.

**Cuantificación** (ejecutada, degradación 0,5 %/año y mantenimiento 50 €/año):

| Ahorro anual | Lineal (lo que se muestra) | Con IPC energético 3 % | Con IPC 5 % |
|---|---|---|---|
| 300 € | 3.000 € | 2.859 € (−141) | 3.182 € (+182) |
| 400 € | 4.000 € | 3.978 € (−22) | 4.410 € (+410) |
| 600 € | 6.000 € | 6.217 € (+217) | 6.864 € (+864) |
| 900 € | 9.000 € | 9.576 € (+576) | **10.547 € (+1.547)** |

La desviación es moderada en el escenario central y **crece con el consumo**: hasta un 17 % en el caso de 900 €/año, que es justamente el cliente más valioso. Y el signo del error depende de hipótesis que no se muestran.

**Cómo reproducirlo.** Generar un informe en `/simulador` con un consumo alto y comparar `ahorro_10_anios` con el resultado de `calculateSavingsProjection` usando las mismas hipótesis.

**Recomendación.** Decidir una de dos, no dejarlo como está:
- (a) Conectar el modelo existente y mover el cálculo al backend para que haya una sola fuente. Requiere exponer las hipótesis (degradación, IPC energético, mantenimiento) como supuestos visibles, igual que ya se hace con el resto.
- (b) Si se descarta, **borrar el módulo y sus tests**: mantener 12 tests verdes sobre código muerto da una sensación de cobertura que no existe.

---

### I-02 · Un payback de «0 años» cuando en realidad no hay retorno

- **Severidad:** Crítica
- **Impacto:** La instalación menos rentable posible se presenta como la de retorno instantáneo.

**Evidencia.** `apps/api/servicios/calculo_financiero.py:163`:

```python
tiempo_retorno = coste_inicial / ahorro_anual if ahorro_anual > 0 else 0.0
```

Si `ahorro_anual` es 0 —posible con un `precio_kwh` manual de 0, o con un consumo tan bajo que el autoconsumo se anula—, el resultado es `0.0`, que la interfaz muestra como «0 años».

**Es el mismo error conceptual que ya se corrigió en el motor normativo** («~0 días estimados» cuando no había plazos): confundir *ausencia de dato* con *valor cero*. Que se repita en otro módulo sugiere que conviene revisarlo como patrón, no como incidencia aislada.

**Recomendación.** `tiempo_retorno` a `None` y que la interfaz muestre «sin retorno con estos parámetros». Añadir un test de regresión que fije que 0 nunca es un payback válido.

---

# Hallazgos Altos

### I-03 · Tres motores de cálculo, dos en uso, con presentaciones incompatibles

- **Severidad:** Alta
- **Impacto:** La misma pregunta obtiene dos respuestas distintas según la sección por la que entre el usuario.

**Evidencia.**

| Motor | Ubicación | Uso | Presentación |
|---|---|---|---|
| `solar.ts` | frontend | `/orientacion` | **Horquilla** min–max, con 5 % de pérdidas extra en el mínimo |
| `calculo_financiero.py` | backend | `/simulador` | **Punto único**, punto medio de cada horquilla, sin las pérdidas extra |
| `economic-projection.ts` | frontend | ninguno | — |

Verificado numéricamente que el punto del simulador cae dentro de la horquilla de orientación (para 5 kWp: 548 € frente a un rango de 347–731 €), así que **no hay contradicción aritmética**. El problema es de producto: una sección comunica incertidumbre honestamente y la otra proyecta una precisión que el modelo no tiene.

**Recomendación.** Un solo motor en el backend, y que ambas secciones muestren horquilla. El punto único es la presentación menos defendible de las dos.

---

### I-04 · El precio de la electricidad está desactualizado, y el código lo sabe

- **Severidad:** Alta
- **Impacto:** Subestima el ahorro en torno a un 14 %, lo que perjudica al propio argumento de venta.

**Evidencia.** `apps/web/content/benchmarks_fv.ts:36-42`:

```
valor: 0.261,   fecha: "2025-S1"
nota: "...S2-2025 apunta a ~0,2975 EUR/kWh según fuentes secundarias;
       actualizar cuando se confirme en el dataset."
```

Estamos en agosto de 2026 usando un precio del primer semestre de 2025, con una nota interna que reconoce que ya hay un valor más reciente pendiente de confirmar.

**Recomendación.** Confirmar el dato en Eurostat `nrg_pc_204` y actualizarlo, o exponer la fecha del precio en la interfaz junto al resultado. Lo segundo es más barato y más honesto: el usuario ve con qué precio se ha calculado.

---

### I-05 · La «factura actual» no incluye el término de potencia

- **Severidad:** Alta
- **Impacto:** El usuario compara la cifra con su factura real, no cuadra, y pierde confianza en todo el informe.

**Evidencia.** `calculo_financiero.py:170`: `factura_actual_anual = consumo_anual_kwh * precio`. El término fijo de potencia es del orden del 30–40 % de una factura doméstica española y no está modelado. La propia nota de `benchmarks_fv.ts` lo dice: *«NO incluye término fijo de potencia»*.

El supuesto se registra en el objeto `supuestos` (líneas 242-255), redactado con honestidad. **Lo que no he podido confirmar es que ese supuesto se renderice junto a la gráfica de factura**; si no se muestra, la honestidad se queda en el backend.

**Recomendación.** Renombrar el concepto a «coste anual de la energía consumida» —que es lo que de verdad calcula— o incorporar el término de potencia. Y verificar que el supuesto aparece junto a la cifra.

---

### I-06 · Redundancia funcional: «Orientación» y «Simulador AI»

- **Severidad:** Alta (de producto, no técnica)
- **Impacto:** Dos entradas de menú para el mismo trabajo, con nombres que no explican en qué se diferencian.

Ambas responden a «cuánto ahorro con una instalación fotovoltaica». Orientación añade fichas por tecnología e índice de idoneidad; el Simulador añade texto generado por LLM y la subida de un CSV de Datadis.

**Recomendación.** Fusionar en una sola sección con dos niveles: estimación rápida (horquilla, sin datos) y análisis detallado (con consumo real). Si se mantienen separadas, los nombres deben decir en qué se diferencian.

---

# Hallazgos Medios

### I-07 · El ratio de autoconsumo se aplica sobre dos bases distintas

`calculo_financiero.py:146-156`. Sin datos mensuales, el ratio del 30 % se aplica **sobre la producción anual**. Con datos mensuales, se aplica **sobre la suma de mínimos mensuales**, que es una magnitud distinta y menor.

El comentario justifica el cambio como una mejora de precisión, y la intención es correcta: evitar que la producción de un mes compense el bajo consumo de otro. Pero el ratio 20–40 % del sector se define sobre la producción, no sobre el mínimo mensual. Al cambiar la base sin recalibrar el ratio, el resultado con datos reales **subestima sistemáticamente** frente al resultado sin ellos: aportar un CSV de Datadis empeora el ahorro estimado, que es lo contrario de lo que el usuario espera al aportar datos.

**Recomendación.** Con perfil mensual real, el techo `min(producción_mes, consumo_mes)` ya limita físicamente el autoconsumo; el ratio adicional debería ser el de simultaneidad intradía, que es más alto que el anual (del orden de 0,5–0,7 sobre el mínimo mensual). Recalibrar o documentar la diferencia.

### I-08 · No se avisa cuando el consumo excede el dimensionamiento máximo

`calculo_financiero.py:133`: la potencia se acota a `[1,5 , 10]` kWp. Un consumo de 20.000 kWh/año da 14,3 kWp brutos, se recorta a 10, y el informe no dice que la instalación propuesta **no cubre el perfil del usuario**. El recorte es sensato; el silencio no.

**Recomendación.** Añadir un supuesto explícito cuando `kwp_bruta` se sale del rango.

### I-09 · Constantes de mercado duplicadas con sincronización manual

`calculo_financiero.py:20-21` lo admite: *«Mantener ambos ficheros sincronizados si se actualiza uno de los dos»*. Hoy coinciden —lo he verificado: 900/1400, 0,2/0,4, 0,261—, pero es cuestión de tiempo.

**Recomendación.** Una única fuente. Lo más simple: un JSON en el backend y un script que genere el `.ts`, siguiendo el patrón que ya se usa con `cobertura_normativa.ts` y `campos_condicionales.ts`.

### I-10 · «Simulador AI»: nombre en inglés y marca de IA sobre un motor determinista

Entrada de sidebar `/simulador`, etiqueta «Simulador AI». Dos problemas: es la única etiqueta en inglés de una interfaz en español, y atribuye a la IA un cálculo que el propio docstring describe como determinista y auditable —*«El LLM, si se usa, queda limitado a texto y nunca decide una cifra»*—. El producto se está vendiendo peor de lo que es.

**Recomendación.** «Simulador de ahorro».

---

# Hallazgos Bajos

- **I-11.** `NotificationBell.tsx:67,77`: dos `.catch(() => {})` en el marcado de notificaciones como leídas. Es una degradación aceptable, pero si falla el servidor el estado local queda desincronizado sin que nadie lo sepa. Un `console.warn` bastaría.
- **I-12.** `app/api/asistente/route.ts:53`: `catch {}` sin comentario que explique por qué se ignora.
- **I-13.** Rutas alcanzables solo desde el pie de página (`/documentacion`, `/producto/motor-normativo`). No es un error, pero es contenido de venta con poca visibilidad.

---

# Funcionalidades Incompletas

1. **Proyección económica** (I-01): construida, testeada, sin conectar.
2. **Cobertura del validador**: 60 de 85 combinaciones sin comprobaciones específicas. Ya documentado en la auditoría de QA; el panel ahora lo declara honestamente, pero la funcionalidad sigue incompleta.
3. **Segundo supuesto del RITE para calentadores**: resuelto esta semana; queda el caso de sistemas con varios equipos cuya suma supere 70 kW, que depende de un dato que el formulario no pide.

# Funcionalidades Sin Valor Claro

**Ninguna sección del sidebar es prescindible**, y conviene decirlo porque la pregunta era si sobraba algo:

| Sección | Problema que resuelve | Veredicto |
|---|---|---|
| Expedientes | Seguimiento del trabajo real | Núcleo del producto |
| Nueva | Punto de entrada | Núcleo |
| Orientación | Preventa: ¿me interesa? | Útil, **solapa con Simulador** |
| Plantillas | Qué documentos hacen falta | Útil |
| Alertas BOE | Cambios normativos que afectan a expedientes vivos | **El más diferencial** |
| Estadísticas | Plazos reales frente a legales | Útil; depende de tener volumen |
| Simulador AI | Análisis de ahorro con datos reales | Útil, **solapa con Orientación** |

El único solapamiento real es Orientación ↔ Simulador (I-06). **Alertas BOE es la funcionalidad que más justifica el precio del producto** y, sin embargo, es la sexta entrada del menú y no aparece en la landing. Es un problema de posicionamiento, no de producto.

---

# Problemas Matemáticos Detectados

| ID | Problema | Gravedad |
|---|---|---|
| I-01 | Ahorro plurianual lineal, sin degradación ni IPC energético ni mantenimiento | Crítica |
| I-02 | Payback 0 cuando no hay retorno | Crítica |
| I-05 | Factura sin término de potencia presentada como factura | Alta |
| I-07 | Ratio de autoconsumo aplicado sobre bases distintas según haya datos o no | Media |
| I-04 | Precio de la energía desactualizado | Alta |

**Lo que está bien y no debe romperse:** el motor es determinista y trazable, cada cifra lleva su supuesto con fuente y etiqueta `leido`/`estimado`, y el LLM tiene prohibido decidir números. Esa arquitectura es la correcta; lo que falla es la calibración y la conexión, no el diseño.

# Problemas de UX Detectados

Los de la auditoría de diseño siguen vigentes; se añaden aquí los de esta:

- **Punto único frente a horquilla** (I-03): el simulador comunica una precisión que el modelo no tiene.
- **Supuestos que no llegan a la pantalla** (I-05): el backend es honesto, la interfaz no siempre lo transmite.
- **«Simulador AI»** (I-10): nombre que confunde y desmerece.

# Problemas de Arquitectura Detectados

1. **Lógica de cálculo repartida entre frontend y backend** sin criterio claro: `solar.ts` calcula en cliente, `calculo_financiero.py` en servidor, y ambos con las mismas constantes duplicadas. Riesgo de divergencia (I-09).
2. **Código muerto con tests** (I-01): la peor combinación, porque parece cubierto.
3. **Ausencia de una fuente única de constantes de mercado**, cuando el proyecto ya tiene el patrón resuelto para la normativa.

# Problemas de Integración Detectados

No se han encontrado enlaces internos rotos, botones sin acción ni rutas huérfanas. La integración entre frontend y motor normativo quedó reparada esta semana (hallazgo C-01 de la auditoría de QA), con un test de contrato que impide que vuelva a romperse.

**Pendiente de verificar en ejecución:** comportamiento de PVGIS ante indisponibilidad del servicio, y qué ve el usuario si esa llamada falla.

# Riesgos de Producción

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| Un cliente decide una inversión con el ahorro a 10 años lineal | Alta | Alto — reputacional y potencialmente contractual |
| Las constantes de los dos ficheros divergen en el próximo cambio | Media | Medio |
| El precio de la energía sigue desactualizándose sin aviso | Alta | Medio |
| PVGIS no responde y el informe sale con la media nacional sin destacarlo | Media | Medio |

---

# Recomendaciones Priorizadas

**P0 — antes de enseñar el simulador a un cliente**

1. Resolver I-01: conectar el modelo de proyección o borrarlo. No dejar código muerto con tests.
2. Corregir I-02: payback `None`, nunca 0, con test de regresión.
3. Mostrar la horquilla en el simulador en vez del punto único (I-03).

**P1 — siguiente iteración**

4. Actualizar el precio de la energía y mostrar su fecha junto al resultado (I-04).
5. Renombrar «factura actual» o incorporar el término de potencia (I-05).
6. Fuente única de constantes de mercado, con generador (I-09).
7. Renombrar «Simulador AI» (I-10).

**P2 — producto**

8. Fusionar Orientación y Simulador, o diferenciarlos por nombre (I-06).
9. Subir Alertas BOE en la jerarquía y llevarlo a la landing: es el argumento más diferencial y está escondido.
10. Recalibrar el ratio de autoconsumo con perfil mensual (I-07).

---

# Puntuación global

| Dimensión | Nota | Justificación |
|---|---|---|
| **Funcionalidad** | 7,5 | Todo lo que se ofrece funciona; cero botones muertos y cero enlaces rotos. Penaliza la redundancia Orientación/Simulador y la funcionalidad construida sin conectar. |
| **Robustez** | 7,0 | Schema endurecido, 1.223 tests, errores tratados. Penaliza el payback 0 y que no haya verificación en ejecución real. |
| **UX** | 6,5 | Mejorada esta semana. Penaliza la falsa precisión del simulador y los supuestos que no llegan a pantalla. |
| **Arquitectura** | 6,5 | Separación limpia motor/API/UI y patrón de generación de datos bien resuelto. Penaliza la lógica de cálculo duplicada entre capas. |
| **Calidad del código** | 7,5 | Comentarios que explican el porqué, tests de contrato, disciplina de verificación poco habitual. Penaliza el código muerto. |
| **Valor para el cliente** | 7,0 | El motor normativo con base legal citada y los huecos declarados es genuinamente diferencial. Penaliza que la capa económica no esté a esa altura y que Alertas BOE esté escondido. |
| **Preparación para producción** | 6,0 | La parte normativa está lista. **La económica no debería enseñarse a un cliente hasta resolver I-01 e I-02.** |

**Media ponderada: 6,9 / 10.**

La lectura correcta de esa nota no es «producto mediocre», sino **producto con un núcleo notable y un módulo que arrastra la media**. La distancia entre el rigor del motor normativo y el de la capa económica es el hallazgo de fondo de esta auditoría: la misma organización que documenta cada hueco de verificación normativa está mostrando un ahorro a diez años como una multiplicación. Aplicar a los números el estándar que ya se aplica a la normativa subiría la media por encima de 8 sin tocar una sola funcionalidad nueva.
