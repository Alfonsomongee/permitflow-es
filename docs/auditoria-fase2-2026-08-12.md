# Auditoría integral — Fase 2 (evidencias)

**Fecha:** 2026-08-12
**Método:** inspección directa del repositorio (grep/AST estático, `ts-prune`, ejecución real de funciones con casos límite). Cada hallazgo cita archivo y línea. Donde no he podido ejecutar algo (navegador, base de datos en producción, carga concurrente real) lo digo explícitamente — no lo he comprobado y no afirmo que funcione o falle.

Esta fase no repite la auditoría integral del 11/08. Amplía cobertura donde esa auditoría se quedó en análisis: código muerto localizado por herramienta (no por muestreo), un bug reproducido con inputs reales, y una triplicación de sistema que no se había visto.

---

## 1. Cobertura funcional real

Inventario por conteo directo:

| Capa | Cantidad | Cómo se contó |
|---|---|---|
| Páginas (`app/**/page.tsx`) | 17 | `find` |
| Rutas API Next.js (`app/api/**/route.ts`) | 32 | `find` |
| Componentes (`components/**/*.tsx,.ts`) | 89 | `find` |
| Servicios backend (`servicios/*.py`) | 16 | `find` |
| Routers FastAPI | 9 | `include_router` en `main.py` |
| Endpoints backend (`@router.*`) | 14 | grep sobre routers |

**Estado por página** (uso = enlazada desde sidebar/flujo real; no uso = accesible solo por URL directa):

| Página | En uso | Tests que la cubren | Observación |
|---|---|---|---|
| `/expedientes`, `/expedientes/[id]` | Sí, hub principal | Amplia (motor normativo + componentes) | Núcleo del producto |
| `/nueva-instalacion` | Sí | Amplia | — |
| `/orientacion`, `/orientacion/[tecnologia]` | Sí | `solar.test.ts` | Ver §4: incentivos fiscales casi vacíos en este flujo |
| `/plantillas` | Sí | Parcial (generación backend testeada, UI no) | Genera con `python-docx`, no LLM (ya corregido el acento "IA" el 11/08) |
| `/alertas` | Sí, pero enlace ausente en marketing | `test_notificaciones` backend | Es la función con mayor diferenciación real (§6) y la peor posicionada |
| `/estadisticas` | Sí | Ninguno en frontend | KPIs correctos, pero calculados en el cliente sin test — ver §3 |
| `/simulador` | Sí | `test_calculo_financiero*.py`, `solar.test.ts` | Se solapa conceptualmente con `/orientacion` (ya documentado como I-06) |
| `/ajustes` | Sí | Ninguno | Página de higiene, no de valor — correcto que exista igualmente |
| `/portal/[token]` | Sí (cliente externo) | Ninguno | Sin autenticación Clerk por diseño; ver §7 sobre robustez de token |
| `(marketing)/*` | Sí | Ninguno | Fuera del alcance de "producto" propiamente |

**Endpoints backend — prefijo inconsistente** (afecta a cobertura funcional porque revela que "API" no es un concepto único en este backend):

```
routers/clasificador.py   → /api/v1/clasificador
routers/documentos.py     → /api/v1/documentos
routers/validador.py      → /api/v1/validador
routers/orientacion.py    → /api/v1/orientacion
routers/asistente.py      → /api/v1/asistente
routers/ayudas.py         → /api/v1/ayudas
routers/contacto.py       → /contacto        ← sin versión
routers/newsletter.py     → /newsletter      ← sin versión
routers/simulador.py      → /simulador       ← sin versión
```

No es un bug hoy (cada proxy de Next.js llama a la URL correcta), pero es deuda arquitectónica real: el día que haya que versionar la API (`/api/v2/...`), tres routers no tienen dónde colgarse de forma consistente, y cualquier desarrollador nuevo que asuma "todo vive bajo `/api/v1`" escribirá una llamada rota a la primera.

---

## 2. Código muerto — tabla con evidencia

Localizado con `ts-prune` (análisis estático de exports no consumidos) más verificación manual archivo por archivo para descartar falsos positivos (barrels que sí se importan por ruta de carpeta).

| Elemento | Archivo | Evidencia | Impacto |
|---|---|---|---|
| Módulo completo de proyección financiera | `lib/calculations/economic-projection.ts` | Solo lo importa su propio `.test.ts` | Ya documentado el 11/08 (I-01). Sigue sin conectar. |
| Función de system prompt | `components/chat/buildSystemPrompt.ts` | 0 importadores; el propio comentario dice "devuelve un dummy... se mantiene por compatibilidad temporal" | Confirma que es basura conocida, no descubierta |
| Datos de demo del dashboard | `lib/demo-data.ts` (26 líneas, `DEMO_KPIS`, `DEMO_TENDENCIA`, `DEMO_ESTADOS`) | 0 importadores reales; solo mencionado en un comentario de `estadisticas.ts` diciendo que fue sustituido | — |
| 4 barrels sin usar | `components/{chat,dashboard,layouts,marketing}/index.ts` | 0 imports vía ruta de carpeta en toda la base | Nadie importa `from "@/components/dashboard"`; todo importa el archivo directo. Sí existen barrels que **sí** se usan (`nueva-instalacion`, `plan-tramitacion`) — la inconsistencia entre "unos barrels viven y otros no" es en sí misma deuda: nadie sabe cuál es el patrón vigente |
| Primitivo Slider (shadcn) | `components/ui/slider.tsx` | 0 usos de `<Slider` en toda la base | Instalado, nunca montado en ningún formulario |
| `eliminarExpediente()` | `lib/expedientes.ts:146` | Función completa, con scoping por `org_id`, sin ninguna ruta ni botón que la llame | No hay DELETE en `app/api/expedientes/[id]/route.ts` (solo PATCH) ni texto "eliminar/borrar" en ningún componente de expedientes. **Gap de producto real**: un usuario no puede borrar un expediente creado por error, aunque el backend ya sabe hacerlo |
| `actualizarEstado()` | `lib/expedientes.ts:122` | 0 llamadas | Superada por `aplicarPatchExpediente`, que sí está wireado — código legado, no gap funcional |
| Registro "plugin" de catálogo legal | `lib/legal/catalog.ts`: `registerLegalReference`, `registerIncentive`, `registerFundingCall`, `getLegalReference`, `getIncentive`, `getFundingCall` | 0 llamadas en toda la base (ni siquiera `selectors.ts` los usa; lee los `Map` directamente) | `fundingCallsCatalog` se inicializa vacío y **nunca se puebla** — cualquier UI que lo consultara mostraría siempre cero convocatorias, sin error |
| Dataset de incentivos fiscales por CCAA | `content/incentivos_ccaa.ts` (212 líneas, 19 entradas: 17 CCAA + Ceuta + Melilla-adyacente) | 0 importadores reales — solo referenciado en un comentario de `content/legal/incentives/index.ts` que dice "se cargarán aquí" (futuro, sin hacer) | **El hallazgo más grande de código muerto de esta fase.** Ver detalle en §4 |

**Nota metodológica:** `ts-prune` también señaló como "no usados" los símbolos re-exportados en `components/nueva-instalacion/index.ts` y `components/plan-tramitacion/index.ts` — los descarté como falsos positivos porque esos barrels sí se importan por ruta de carpeta (`from "@/components/plan-tramitacion"`), solo que `ts-prune` no sigue el re-export transitivo. Lo dejo explícito porque es exactamente el tipo de error que ya cometí dos veces en fases anteriores (medir un agregado sin abrir el caso).

---

## 3. Tests: qué NO está protegido y qué da falsa seguridad

No cuento cuántos tests hay. Esto es lo que importa:

**3.1 — El test que dice "el payback nunca es cero" no lo demuestra.**

`apps/api/tests/test_calculo_financiero_payback.py::test_el_payback_nunca_es_exactamente_cero` barre `precio_kwh` en `(0.0, 0.05, 0.1, 0.261, 0.5, 1.0)`. Ejecuté la función fuera de ese barrido:

```
calcular_escenario_fv(consumo_anual_kwh=3500, precio_kwh=1000)
→ coste_inicial=2875.0, ahorro_anual=1050000.0, tiempo_retorno_anios=0.0
```

`round(2875/1050000, 1) == 0.0`. Es el mismo bug conceptual que ese test fue escrito para impedir (I-02, corregido el 11/08), reapareciendo por un camino distinto: no por ausencia de ahorro, sino por un payback real pero tan corto (~1 día) que el redondeo a 1 decimal lo convierte en el mismo "0" engañoso. `precio_kwh` no es alcanzable hoy desde ningún endpoint (verificado: ningún router ni schema pasa ese parámetro; siempre usa el valor por defecto 0.261), así que **no es explotable en producción ahora mismo** — pero el test que existe afirma una garantía que no es cierta, y si algún día se expone `precio_kwh` (por ejemplo al usar el precio real de una factura), el bug vuelve sin aviso.

**3.2 — Nada impide que `benchmarks_fv.ts` y `calculo_financiero.py` diverjan.**

El propio código lo admite (`calculo_financiero.py:8-11`: *"Se han portado desde apps/web/content/benchmarks_fv.ts para no duplicar números divergentes... Mantener ambos ficheros sincronizados si se actualiza uno de los dos"*). Hoy están sincronizados (verificado número a número: `0.261`, `900-1400`, `0.2-0.4`). No existe ningún test —ni en `apps/api/tests` ni en `apps/web/lib`— que compare ambos ficheros. La única garantía es un comentario pidiendo disciplina manual.

**3.3 — Un `NaN` en `consumo_anual_kwh` no rompe nada, y eso es peor que si rompiera.**

```python
calcular_escenario_fv(consumo_anual_kwh=float('nan'))
→ coste_inicial=11500.0, ahorro_anual=1096.2, potencia_kwp=10.0
```

Idéntico resultado que con `consumo_anual_kwh=float('inf')`, e idéntico a un consumo real que diera esa potencia. La guarda de entrada (`clasificador.py:122`: `if consumo_anual_kwh is None or consumo_anual_kwh <= 0`) no atrapa `NaN` porque en Python toda comparación con `NaN` es `False`. El resultado no es un error: es una instalación de 10 kWp por 11.500 € presentada con total normalidad. No hay ningún test que alimente `NaN`, `inf` o cadenas no numéricas a esta función pese a que `consumo_anual_kwh` puede originarse en un parseo de CSV/PDF de factura (`datadis_parser.py`, `facturas_parser.py`) — una vía de entrada con formato variable donde un fallo de parseo produciendo `NaN` es plausible.

**3.4 — El formulario de nueva instalación valida un campo de nueve.**

`lib/validations/nuevaInstalacion.ts`: de los campos numéricos (`superficie_m2`, `numero_puntos`, `potencia_por_punto_kw`, `presion_bar`, `inversion_eur`, `potencia_resultante_kw`, `presion_resultante_bar`, `incremento_potencia_pct`), solo `potencia_kw` tiene `.refine()` comprobando que sea un número positivo. El resto son `z.string()` sin más. Un usuario puede escribir `numero_puntos = "-5"` y el formulario lo deja pasar; el rechazo llega recién en el backend (Pydantic, `ge=1`), con un mensaje que `stringifyErrorDetail()` (`app/api/clasificar/route.ts`) traduce a algo legible pero que conserva vocabulario de Pydantic en inglés ("Input should be..."). No es un error grave — el dato nunca llega a persistirse mal — pero es inconsistencia de rigor dentro del mismo formulario, y no hay ningún test de frontend que pruebe estos campos con valores negativos.

**3.5 — Las validaciones transversales del validador (4 reglas de base estatal) no tienen test de "qué pasa si el usuario ya cumple todas".** Existen 13 tests para `test_validador_formatos.py` sobre los tres formatos JSON soportados, pero no hay un test explícito que confirme que un caso 100% conforme produce cero advertencias transversales (solo se prueba el camino de "falta algo"). Es una asimetría menor pero típica de cómo se acumula falsa seguridad: se testea el camino que genera texto, no el camino que debe quedarse en silencio.

---

## 4. Consistencia entre módulos — el hallazgo nuevo de esta fase

Ya se documentó (11/08) la duplicación en el cálculo financiero. Buscando más, encontré una **triplicación** en el dominio de incentivos/ayudas que no se había visto porque cada pieza, mirada aislada, "funciona":

| Sistema | Dónde vive | Estado |
|---|---|---|
| 1. Ayudas y subvenciones (backend) | `servicios/ayudas.py` + `catalogo_ayudas.py`, expuesto en `/api/v1/ayudas/simular` | Real, testeado, wireado a `IndiceIdoneidad`/asistente |
| 2. Incentivos fiscales (frontend, en producción) | `content/legal/incentives/index.ts` → `stateIncentives` + `regionalIncentives` | Real y wireado (`BloqueFiscal.tsx`), pero **solo tiene 1 de 17 CCAA pobladas** (Illes Balears) más 4 entradas estatales, una de ellas marcada `status: 'obsolete'` (Plan MOVES III, cerrado en diciembre 2025) que sigue en el array |
| 3. Incentivos fiscales (frontend, completo, muerto) | `content/incentivos_ccaa.ts` | Dataset con las 17 CCAA + Ceuta, con niveles de verificación y notas de incompatibilidad entre deducciones cuidadosamente redactadas — **y cero conexión a la UI** |

Efecto medible: un usuario en, por ejemplo, Cataluña o Madrid que entra en `/orientacion` para ver qué deducción autonómica de IRPF le corresponde por instalar autoconsumo, no ve nada — no porque no exista el dato (existe, está escrito, con sus fuentes marcadas como "pending_verification"), sino porque nadie conectó el archivo 3 con el archivo 2. Es el mismo patrón que I-01 (`economic-projection.ts` desconectado), pero en un dominio distinto y con más superficie: 16 comunidades autónomas de datos fiscales completamente invisibles para el usuario.

**Otro hallazgo de consistencia:** los tipos de respuesta del simulador están duplicados a mano. `types/simulador.ts` declara `GenerarResponse`, `EstudioResponse`, `FacturaResponse` como interfaces TypeScript escritas a mano, con el comentario explícito *"Alineados manualmente hasta que openapi-typescript esté activo en postinstall"*. `lib/schemas/simulador.ts` deriva los mismos tres tipos con `z.infer<>` desde esquemas Zod reales (que sí validan en tiempo de ejecución). Hoy coinciden. El equipo ya sabe que es temporal — está en el propio comentario — pero mientras tanto cualquier cambio de campo en el backend que se refleje en el schema Zod y se olvide en la interfaz manual no lo detecta ningún test ni el compilador (son dos fuentes de verdad tipadas de forma independiente).

**El precio real de la factura no llega al cálculo, aunque el usuario la suba.** `informes_ia.py:109-116` llama a `calcular_escenario_fv(...)` sin pasar nunca `precio_kwh`, ni siquiera cuando el origen del consumo es un CSV de Datadis o un PDF de factura real (`datos_factura.get(...)` solo extrae `consumo_anual_kwh`, `potencia_contratada_kw` y, si es Datadis, `consumo_mensual_kwh` — nunca un precio). Confirmé que ni `facturas_parser.py` ni `datadis_parser.py` extraen precio en ningún punto. No es un bug de "dato descartado", es una funcionalidad que nunca se construyó: subir tu factura real mejora la precisión del consumo, pero el precio del kWh sigue siendo siempre la media nacional de Eurostat (0,261 €/kWh, con fecha S1-2025 — más de un año desactualizada a día de hoy, como ya señalaba la propia nota en `benchmarks_fv.ts`). Para un usuario con tarifa indexada o un precio contratado muy distinto de la media, el ahorro proyectado puede estar sistemáticamente sesgado y el producto no tiene forma de saberlo ni de avisar de ello.

---

## 5. Casos extremos — comportamiento observado (no teórico)

Todo lo siguiente se ejecutó de verdad contra `apps/api/servicios/calculo_financiero.py`:

| Entrada | Resultado real | ¿Es el esperado? |
|---|---|---|
| `consumo_anual_kwh=-100` | `ValueError` claro | Sí |
| `consumo_anual_kwh=0` | `ValueError` claro | Sí |
| `consumo_anual_kwh=10_000_000` | `potencia_kwp=10.0` (tope), payback=10.5 años | Sí, el clamp funciona |
| `precio_kwh=-0.5` | `ahorro_anual=-525.0`, `tiempo_retorno_anios=None` | Dudoso: un ahorro negativo pasa sin ninguna validación de rango en `precio_kwh`. No alcanzable hoy vía API (ver §4), pero la función en sí no se defiende |
| `precio_kwh=1000` | `tiempo_retorno_anios=0.0` | **No** — ver §3.1, regresión del patrón I-02 |
| `consumo_anual_kwh=float('nan')` | Resultado idéntico a un caso normal de 10 kWp, sin error | **No** — ver §3.3 |
| `consumo_anual_kwh=float('inf')` | Clampa correctamente a 10 kWp | Sí (por casualidad de cómo Python compara `inf`, no por una guarda explícita para infinitos) |

No he podido reproducir casos extremos equivalentes contra el `clasificador.py` del motor normativo en esta pasada por límite de tiempo — esa superficie ya recibió 32 tests de entradas imposibles en la auditoría del 11/08 (`test_entradas_invalidas.py`), así que la relación esfuerzo/hallazgo nuevo era más baja ahí que en el simulador financiero, que no había recibido ese trato.

**Flujos interrumpidos — no verificado.** No he comprobado qué ocurre si un usuario cierra la pestaña a mitad del wizard de `/nueva-instalacion` (¿se pierde el draft? ¿hay `localStorage`/autosave?) ni qué pasa si el token de `/portal/[token]` expira mientras el cliente tiene el formulario de subida de documentos abierto. Ambos son casos extremos reales que no he ejecutado — los señalo como pendientes, no como comprobados.

---

## 6. Sidebar — revisión crítica con puntuación

| Sección | Problema que resuelve | Frecuencia esperada | Valor económico | Diferenciación | Puntuación |
|---|---|---|---|---|---|
| Expedientes | Gestionar el ciclo de vida de cada trámite en curso | Diaria | Alto (es el producto) | Total | 9/10 |
| Nueva | Iniciar un expediente y obtener el plan normativo | Varias veces/semana | Alto (motor normativo, el activo más difícil de replicar) | Total | 9/10 |
| Orientación | Explorar viabilidad antes de comprometerse | Ocasional (pre-venta) | Medio, **lastrado hoy**: la sección fiscal muestra datos de 1 de 17 CCAA (§4) | Parcial frente a Simulador — ambas responden "¿me compensa?" con matemáticas distintas | **6/10** — el diseño es correcto, la ejecución de datos no |
| Plantillas | Generar documentación de trámite lista para presentar | Por trámite | Medio-alto | Alta (nadie más genera Anexo I/II auto-rellenados) | 8/10 |
| Alertas BOE | Avisar de cambios normativos que afectan a expedientes abiertos | Pasiva/diaria (notificación) | **El más alto de todos**: es lo único que un despacho no puede vigilar manualmente a esta escala | Total, sin competencia interna | 9/10 valor — pero posición 5 de 8 en el menú y ausente de la landing es un error de priorización, no de la función en sí |
| Estadísticas | Ver cumplimiento de plazos agregado del despacho | Semanal/mensual | Medio (gestión, no operación) | Media | 7/10 |
| Simulador AI | Generar un informe de ahorro para el cliente final | Por oportunidad comercial | Medio, lastrado por el mismo problema de precio-no-real que Orientación (§4), y por nombre engañoso ("AI" en un motor determinista) | Baja frente a Orientación | **6/10** |
| Ajustes | Configuración de cuenta/organización | Rara | Bajo por diseño (es higiene, no producto) | N/A | No aplica puntuación de valor — su justificación es estructural, no de diferenciación |

**Conclusión distinta de la del 11/08:** entonces dije que ninguna sección sobraba, y lo mantengo — no hay ninguna que deba eliminarse. Pero dos de las ocho (Orientación, Simulador) puntúan por debajo de 7 no por defecto de diseño sino porque **comparten el mismo problema de datos incompletos** documentado en §4. Arreglar el dato (conectar `incentivos_ccaa.ts`, pasar el precio real de factura) sube ambas puntuaciones sin tocar una línea de UI. Es una palanca barata.

---

## 7. Arquitectura: acoplamiento y complejidad accidental

**Puntos de alto acoplamiento (fan-in medido por import):**

- `lib/expedientes.ts` — importado por **51** archivos distintos (rutas API, componentes, páginas). Es correcto que sea el módulo central de datos, pero cualquier cambio de firma en sus funciones exportadas tiene radio de impacto en más de la mitad del árbol de `app/` y `components/`. No hay tests de contrato explícitos para varias de sus funciones más usadas (`actualizarEstado`, por ejemplo, ni siquiera se usa, ver §2).
- `lib/legal/types.ts` — 57 importadores. Mismo patrón: un archivo de tipos se ha convertido en el pegamento de facto entre motor normativo, plan de trámites y UI. Cambiar un campo aquí sin buscar los 57 usos es la forma más fácil de introducir una regresión silenciosa (TypeScript avisará de los que rompan tipos, pero no de los que sigan compilando con semántica distinta).

**Complejidad accidental encontrada:**

- El motor normativo carga el JSON de reglas **desde disco en cada petición** (`clasificador.py:140-141`, `validador.py:138-139`), sin `lru_cache` ni precarga en el ciclo de vida de la app. A tráfico bajo es invisible. No es un defecto de diseño grave hoy, pero es una decisión que un lector nuevo no esperaría dado que las reglas son estáticas entre despliegues — ver §8 para el impacto a escala.
- Redis se instancia por petición en `servicios/rate_limit.py:14-24`, con un comentario propio que dice *"mejorar a lifespan en el siguiente sprint, ver B-13 de la auditoría 2026-08-06"* — es decir, este ítem ya estaba identificado hace más de un mes y sigue sin resolverse. Es la prueba más clara del repositorio de que "documentado" no es lo mismo que "arreglado".
- Los cuatro barrels muertos de `components/` (§2) son, en sí mismos, complejidad accidental: un desarrollador que vea `components/dashboard/index.ts` asumirá razonablemente que ese es el punto de entrada correcto del módulo, lo usará, y tendrá razón sintácticamente (compila) pero estará añadiendo un segundo patrón de import a un módulo que en la práctica solo usa imports directos.

---

## 8. Preparación para producción / escala

Con 1.000 usuarios simultáneos, en orden de probabilidad de ser el primer cuello de botella:

1. **Conexión Redis por petición** (§7). Cada llamada a un endpoint con rate limit (`/contacto`, `/newsletter`, `/simulador/*`) abre y cierra una conexión TCP a Redis. Es exactamente el patrón que un `lifespan` de FastAPI existe para evitar. Bajo carga concurrente real esto es agotamiento de conexiones/descriptores antes que cualquier otro componente del sistema, y el propio código ya lo señala como pendiente desde hace semanas.
2. **Lectura de JSON de reglas por petición** (§7). No es catastrófico (los ficheros son pequeños), pero es I/O de disco síncrono dentro del camino crítico del endpoint más usado del producto (`/api/v1/clasificador`), sin ninguna razón de negocio para no cachearlo — las reglas no cambian entre peticiones, solo entre despliegues.
3. **Rate limiting por IP depende de configuración externa correcta.** El propio comentario en `get_real_ip()` (`rate_limit.py:52-63`) advierte que sin `--proxy-headers` bien configurado en el despliegue, `request.client.host` devuelve la IP del balanceador y **todos los usuarios comparten la misma cuota**. No he verificado en esta auditoría si esa configuración está correctamente aplicada en el entorno de producción real — es un riesgo condicional, no confirmado.
4. **Nuevas CCAA/tecnologías: el diseño aguanta bien.** Este es un punto a favor, no un riesgo: añadir una comunidad autónoma nueva es literalmente añadir un directorio con JSON de reglas — el `lint.py` ya existente detecta incoherencias estáticamente antes de desplegar, y `test_motor_normativo_cobertura.py` generaliza sobre "todas las CCAA×vertical" sin necesitar tocar el test. Es la decisión de arquitectura mejor resuelta de todo el producto (ver §9).
5. **Nuevos motores de cálculo (financiero): el diseño NO aguanta igual de bien.** A diferencia del motor normativo, el dominio financiero tiene ahora mismo tres piezas de cálculo con distinto grado de sofisticación (`calculo_financiero.py`, `economic-projection.ts` desconectado, `solar.ts` del frontend) sin una interfaz común. Añadir un cuarto motor (p. ej. para baterías o IRVE con tarifas dinámicas) probablemente se sumaría como una cuarta pieza aislada en vez de extender una existente, porque no hay un contrato compartido que lo fuerce.

---

## 9. Informe final

### 10 mayores riesgos actuales (orden de severidad × probabilidad)

1. Conexión Redis nueva por petición en producción bajo carga — riesgo de agotamiento de recursos, ya autodocumentado y sin resolver (§7, §8).
2. `NaN`/`Infinity` en `consumo_anual_kwh` produce una cotización de 10 kWp/11.500 € sin ningún error — silenciosamente incorrecto es peor que roto (§3.3, §5).
3. 16 de 17 comunidades autónomas sin datos de incentivos fiscales visibles en `/orientacion`, mientras el dataset completo existe sin conectar (§4).
4. `economic-projection.ts` sigue desconectado (I-01, ya reportado el 11/08, sin acción aún) — hasta un 17% de desviación en el ahorro proyectado para consumos altos.
5. El precio real de la factura del usuario nunca se usa en el cálculo, aunque la suba — el "ahorro personalizado" no lo es del todo (§4).
6. Regresión del patrón "payback = 0" fuera del rango cubierto por su propio test de regresión (§3.1) — hoy no explotable, pero el test da una garantía falsa.
7. Rate limiting por IP potencialmente compartido entre todos los usuarios si la configuración de proxy no es correcta en producción — no verificado, riesgo condicional (§8).
8. Sin forma de borrar un expediente desde la UI pese a que el backend ya lo soporta — gap de producto, no técnico (§2).
9. Router API con prefijos inconsistentes (`/api/v1/*` vs rutas sueltas) — bloqueo de facto para versionar la API sin romper tres integraciones (§1).
10. Dos fuentes de tipos independientes para las respuestas del simulador (`types/simulador.ts` manual vs `lib/schemas/simulador.ts` con Zod), sincronizadas a mano y sin test cruzado (§4).

### 10 mejoras de mayor impacto (esfuerzo vs beneficio, no solo severidad)

1. Conectar `content/incentivos_ccaa.ts` a `content/legal/incentives/index.ts` — dato ya existe, esfuerzo bajo, sube directamente el valor de Orientación y Simulador.
2. Precargar los JSON del motor normativo en el `lifespan` de FastAPI (o `lru_cache`) — esfuerzo bajo, elimina I/O innecesario del camino crítico.
3. Mover Redis a conexión de vida larga vía `lifespan` — ya identificado, solo falta ejecutarlo.
4. Guarda explícita `math.isfinite()` en `calcular_escenario_fv` antes de cualquier operación — cierra §3.3 y §5 con una línea.
5. Decidir el destino de `economic-projection.ts`: conectarlo o borrarlo (I-01, repetido aquí porque sigue sin resolverse).
6. Pasar el precio real de la factura parseada a `calcular_escenario_fv` cuando exista — el dato de consumo ya viaja así, falta el de precio.
7. Test de igualdad numérica entre `benchmarks_fv.ts` y `calculo_financiero.py` (puede ser tan simple como un JSON compartido leído por ambos, o un test que falle si divergen).
8. Eliminar los cuatro barrels muertos de `components/` o, alternativamente, adoptarlos como patrón único y migrar los imports directos — hoy conviven dos convenciones sin razón.
9. Añadir DELETE a `app/api/expedientes/[id]/route.ts` con confirmación en UI — la función de backend ya existe.
10. Unificar el prefijo de API (`/api/v1/*` en los tres routers que faltan) antes de que haya más integraciones externas que fijar.

### 10 decisiones de diseño mejor resueltas

1. Estructura de reglas normativas como JSON por CCAA×vertical con `lint.py` de coherencia estática — escala a nuevas comunidades sin tocar código (§8).
2. Separación estricta entre cálculo numérico determinista y texto generado por LLM en el simulador (`calculo_financiero.py` nunca delega una cifra al modelo).
3. `test_motor_normativo_cobertura.py` generalizado sobre todas las combinaciones CCAA×vertical×uso en vez de casos sueltos — detecta huecos nuevos automáticamente.
4. `stringifyErrorDetail()` en el proxy de clasificación: defensa deliberada contra errores no serializables llegando como `"[object Object]"` a producción.
5. Separación de tenant (`org_id`) aplicada de forma consistente en `lib/expedientes.ts` — cada función exportada la exige, incluida la que nadie usa (`eliminarExpediente`).
6. El validador soporta tres formatos de regla JSON distintos de forma explícita y testeada, en vez de forzar un único formato y perder cobertura silenciosamente (como ocurría antes de la corrección del 11/08).
7. Manejo explícito de conflicto de versión optimista en el PATCH de expedientes (`CONFLICTO_VERSION`, HTTP 409) — no es frecuente ver control de concurrencia bien pensado en un CRUD de este tamaño.
8. `SkeletonLista`/`Skeleton` como primitivas compartidas en vez de estados de carga ad hoc — decisión reciente (11/08) ya dando consistencia.
9. Defensa en profundidad contra path traversal en `clasificador.py:130` (`is_relative_to`) pese a que el schema ya restringe el valor por enum — capa redundante deliberada, correctamente comentada como tal.
10. El linter de coherencia (`lint.py`) valida los propios valores de enum contra el schema Pydantic (`test_los_enums_del_linter_coinciden_con_el_schema`) — es meta-testing bien hecho: el test que vigila que el vigilante no se desactualice.

### Estimación de potencial

**Estado actual: 6,9/10** (cifra heredada de la auditoría del 11/08; esta fase no encontró motivos para revisarla al alza ni a la baja — confirma la misma brecha entre motor normativo y capa financiera/de datos, con más evidencia).

**Tras corregir los hallazgos críticos** (Redis, NaN/Infinity, incentivos desconectados, precio real de factura, economic-projection.ts): **7,8-8,0/10**. Ninguno de estos arreglos requiere rediseño — son conexiones de datos ya existentes o guardas de una función. El techo no sube más porque persisten los hallazgos altos (duplicación de tipos, prefijos de API, barrels muertos) que sí son arquitectónicos.

**Tras corregir además los hallazgos altos** (unificar prefijos de API, eliminar duplicación de tipos del simulador, decidir un único patrón de barrels, test cruzado de constantes de mercado, DELETE de expedientes): **8,5-8,8/10**. El motor normativo ya opera cerca de su techo natural (17 CCAA, lint automático, cobertura generalizada); el resto del producto empezaría a operar con el mismo nivel de disciplina que ya existe ahí. El punto que impediría llegar a 9+ sin trabajo adicional es el diseño financiero de tres piezas sin contrato común (§8, punto 5) — eso sí requeriría una decisión de arquitectura, no solo de limpieza.
