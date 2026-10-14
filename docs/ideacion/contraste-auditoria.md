# Contraste de la «Auditoría integral multidisciplinar» con el repositorio

Fecha del contraste: 2026-10-14. Rama de trabajo `claude/bold-hypatia-1r8jez`, avanzada con fast-forward a `claude/festive-euler-xs09qt` para comparar contra el código más reciente.

**Conclusión en una línea:** la auditoría se hizo sobre una versión anterior del producto o sin abrir el código. De sus 5 hallazgos formales, **3 ya están resueltos, 1 es cierto y 1 es cierto pero mal enfocado**. Además contiene varias afirmaciones que contradicen el repositorio y una recomendación de copy que **violaría el principio de veracidad** del producto.

Leyenda: ✅ confirmado en el código · ❌ falso u obsoleto · ⚠️ parcialmente cierto · ❓ no verificable desde aquí.

---

## 1. Hallazgos formales (sección I)

| # | Afirmación de la auditoría | Veredicto | Lo que hay realmente |
|---|---|---|---|
| 1 | Los enlaces legales del pie están a `href: null` con «Próximamente» | ❌ **Obsoleto** | `Footer.tsx:29-31` ya apunta a `/aviso-legal`, `/privacidad` y `/terminos`; las tres páginas existen (52, 111 y 64 líneas), son públicas en `middleware.ts` y están en `sitemap.ts`. El renderizador de «Próximamente» sigue en el código pero ya no se usa. |
| 1b | (Lo que la auditoría no vio) | ⚠️ **El riesgo real sigue abierto** | `content/titular.ts` tiene **razón social, NIF, domicilio, registro y correos en `null`**. Las páginas muestran «pendiente de completar». Mientras no se rellenen, el art. 10 LSSI-CE y el art. 13 RGPD **siguen sin cumplirse** aunque las páginas existan. Solo lo puede completar quien opera el servicio; no se debe inventar. Hay un test que lo recuerda como aviso en CI, no como fallo. |
| 2 | No existen `robots.txt` ni `sitemap.xml` | ❌ **Falso** | `app/robots.ts` y `app/sitemap.ts` existen. `robots` bloquea `/api/`, `/portal/` y las rutas privadas; `sitemap` lista las 7 rutas públicas. Detalle útil: ambos caen a `http://localhost:3007` si `NEXT_PUBLIC_URL` no está definida en producción (**comprobar la variable en Vercel**). La auditoría propone bloquear `/sign-in` y `/sign-up`, que hoy no se bloquean; es opcional. |
| 3 | No hay `not-found.tsx` ni `error.tsx` | ❌ **Falso** | Existen `not-found.tsx`, `error.tsx` y `global-error.tsx`. **Lo que sí falta:** `error.tsx` solo hace `console.error`; Sentry **no está instalado** en el frontend (no hay dependencia) y en el backend solo existe la variable `SENTRY_DSN` en `config.py`, sin inicializar. AGENTS.md lista Sentry como parte del stack. |
| 4 | No hay facturación anual | ✅ **Cierto** | `PreciosSection.tsx` solo tiene Free / Pro 49 € / Enterprise; `api/stripe/checkout` solo lee `STRIPE_PRICE_PRO`. Matiz: **el precio no está decidido** (49 € frente a 79/149/299 € del fundacional), así que fijar «39 €/mes anual» ahora es prematuro. La cifra objetivo «35 % elige anual» no tiene fuente. |
| 5 | El asistente pide la CCAA a mano; falta autocompletado de municipio | ✅ **Cierto, y más grave de lo que dice** | `Step1TipoUbicacion.tsx` solo tiene un desplegable de CCAA; el formulario **no pide municipio**, aunque el modelo `Expediente` tiene la columna `municipio`. **No hay ningún uso de Places en `apps/web`.** Esto contradice a `AGENTS.md` («autocompletado de dirección con Google Places» marcado como completado) y a `docs/contexto-producto-para-ideacion.md` («ubicación con autocompletado»). **Esos dos documentos están desactualizados o son erróneos**; ya lo he tenido en cuenta en los prompts. |

## 2. Otras afirmaciones de la auditoría

### Contradichas por el repositorio

| Afirmación | Veredicto | Evidencia |
|---|---|---|
| «Solo Andalucía tiene los 5 verticales completamente consolidados» (sección A y G.1.5) | ❌ **Falso** | Andalucía tiene **4 de 5 ficheros en nivel `generica`** y solo ACS como `verificada_parcialmente`. Los mejor valorados son **Madrid y Cataluña** (verificación parcial con observaciones en 9 de 10). **Ningún fichero tiene `revisado_por`** (0/85). |
| Recomienda comunicar que las 17 CCAA «disponen de cobertura estatal plena en FV e IRVE» y añadir tooltips que lo refuercen (G.1.5) | ❌ **No aplicar** | Contradice el principio de que «la veracidad es el producto». Con ~61 de 85 ficheros en `borrador_no_verificado` y 0 revisados por una persona, afirmar «cobertura plena» sería publicidad engañosa. La web hoy dice «Las 17 comunidades, en progreso», que es lo correcto. |
| `ChatWidget` sin `aria-live` (K.1) | ❌ **Falso** | `ChatWidget.tsx:262-266` usa `role="log"`, `aria-live="polite"`, `aria-relevant` y `aria-busy`. |
| Contraste bajo en `text-text-secondary/40` con `line-through` en `PreciosSection` y `TimelinePlan` (K.1) | ❌ **No encontrado** | `grep` no halla esa combinación; solo aparece como `hover:border-text-secondary/40` en inputs. |
| Portal: «el tamaño máximo no se anuncia» y sin validación (G.4) | ⚠️ **Parcialmente falso** | El servidor valida tamaño (15 MB), lista blanca de MIME (PDF, JPG, PNG) y limita a 30 subidas por día y token; la interfaz muestra «PDF, JPG o PNG · máx. 15MB». **Lo que sí falta es el antivirus**, y es correcto marcarlo como deuda. |
| «Next.js 14» (varias secciones) | ❌ | Es **Next.js 15.5** con React 19. |
| «Rate limit con Upstash Redis» (J.1) | ❌ | Hay `servicios/rate_limit.py` con Redis estándar en FastAPI; no hay Upstash. |
| «Migración de tareas de fondo a ARQ» como deuda (M) | ✅ pero ya conocida | `routers/simulador.py:212` ya avisa: «BackgroundTasks es in-process; un deploy durante la ejecución pierde la tarea». |
| «Step 3 consulta en tiempo real las convocatorias» (G.2) | ⚠️ | El catálogo de ayudas está **investigado a mano (jul–ago 2026), no es un feed vivo**; cada entrada lleva fecha y fiabilidad. Llamarlo «tiempo real» exagera. |

### Confirmadas

| Afirmación | Veredicto | Evidencia |
|---|---|---|
| Faltan imágenes OpenGraph, Twitter Cards y JSON-LD (K.3) | ✅ | `layout.tsx` tiene `openGraph` sin imágenes, no hay `twitter` ni `application/ld+json`, y no existe carpeta `public/`. |
| CSP en modo `Report-Only` (K.4) | ✅ | Es **intencional y está documentado** en `next.config.mjs:4-9` (riesgo de romper login de Clerk). Pasar a `enforce` es una tarea pendiente legítima, no un olvido. |
| El CTA «Clasificar instalación» lleva a login sin avisar (G.1.1) | ✅ | `MarketingNav.tsx:55-63` enlaza a `/nueva-instalacion`, que el middleware protege. `ComoFuncionaSection` ya tiene un comentario sobre haber eliminado un «sin registro» engañoso. |
| Hero estático (G.1.2) | ✅ | La tarjeta es fija (Andalucía, 8 kW), basada en un caso de referencia. No hay estado interactivo. |
| No hay exportación `.ics` de plazos (J.3) | ✅ | Ningún `.ics` ni `text/calendar` en el código. Ojo con el riesgo (ver §3). |
| No hay antivirus en las subidas (G.4) | ✅ | No hay escaneo. |
| Pipeline lunes y jueves; 85 combinaciones; Free 5/mes; Pro 49 € | ✅ | `.github/workflows/boe_pipeline.yml` (crons lunes y jueves), 85 JSON, `planes.ts:10` y `PreciosSection`. |
| CAS por versión en expedientes; proxy server-side con `INTERNAL_API_KEY`; RLS multi-tenant | ✅ | `CONFLICTO_VERSION` en la ruta de expedientes; `INTERNAL_API_KEY` en `config.py`; migraciones RLS de agosto 2026. |
| Skip link en `layout.tsx` | ✅ | `layout.tsx:51-54`. |

### No verificadas (no las he podido comprobar)

- Desbordamiento de los botones al aparecer errores de Zod en móvil (G.2, Paso 2).
- Comportamiento de cobro real en Stripe y de los webhooks en producción.
- Latencia real de Google Places (además, hoy no hay Places en el formulario).

## 3. Propuestas de la auditoría: valoración

| Propuesta | Valoración |
|---|---|
| **Clasificador exprés sin registro en la landing** (J.1) | **Buena y alineada con el eje 6.** Hay que condicionarlo: si la salida omite el nivel de verificación, se promete más de lo que se sabe. Mostrar siempre el sello «borrador / parcial / verificado» y la base legal. |
| **Hoja de encargo con tasas** (J.2) | Ya existe un «presupuesto rápido» en PDF (`api/presupuesto`). Antes de ampliarlo, las **tasas** deben estar verificadas: hoy son uno de los datos más inciertos del motor. |
| **Exportar plazos a calendario `.ics`** (J.3) | **Riesgo alto si se hace sin más.** El silencio administrativo y los plazos legales son de los campos «sin confirmar» en la mayoría de ficheros; un evento de calendario con una fecha límite equivocada es peor que no tenerlo. Hacerlo solo para plazos de subsanación del expediente (que introduce el usuario) y no para plazos de la norma sin verificar. |
| **Pago anual** | Esperar a decidir el precio (eje 6) y a tener datos de conversión. |
| **Páginas legales** | Ya existen: la tarea es **rellenar `titular.ts`**, no escribir las páginas. |
| **Sentry / monitoreo** (implícita en el Hallazgo 3) | Sí merece hacerse; está en el stack y no está cableado. |

## 4. Los dos «Deep Research» de la auditoría (sección O)

- **Prompt 1 (tasas y umbrales en Madrid y Cataluña):** la premisa «umbrales de más de 15 kW en borrador» no coincide del todo con el estado actual (Madrid y Cataluña están en verificación parcial con observaciones, salvo FV en Cataluña que está «en revisión»). La investigación sí es útil, pero **encaja mejor en el eje 5** y en la lista ya existente `docs/normativa/fichas-abrir-a-mano.md`. Además, la mayor parte de lo que pregunta (plataforma telemática y tasa por procedimiento) puede salir del catálogo SIA y de las sedes, no de un informe genérico.
- **Prompt 2 (benchmark de precios):** queda **cubierto con más rigor por el eje 6**, que obliga a citar fuente por cada cifra y a medir la disposición a pagar con entrevistas. El de la auditoría pide «ratios de conversión» y «descuento óptimo» sin exigir evidencia, lo que invita a inventar.

## 5. Lo que la auditoría no ve (y que sí condiciona el 100x)

1. **El mayor riesgo del producto no está en la UX, sino en la normativa**: 0 ficheros con revisor humano. Ninguna mejora de conversión compensa una tasa o un plazo falsos. → eje 5.
2. No hay **captura de datos de rechazo** ni de plazos reales por organismo: sin ello no hay foso ni scoring. → eje 3.
3. El producto **no presenta** nada ante las sedes ni rellena los modelos oficiales: es el salto de valor más grande para la instaladora. → eje 4.
4. Faltan variables clave del clasificador (autoconsumo con o sin excedentes, IRVE de acceso público, clase de gas).
5. Sin base de conocimiento indexada, el asistente no puede citar. → eje 1.
6. Datos del titular vacíos y Sentry sin cablear: **dos tareas pequeñas que sí conviene hacer ya**.

## 6. Tareas concretas que salen del contraste (no implementadas)

Ordenadas por relación valor/esfuerzo. Ninguna se ha iniciado, porque pediste solo prompts y contraste.

1. Rellenar `apps/web/content/titular.ts` (lo hace el fundador; es un dato legal que no puedo inventar).
2. Confirmar que `NEXT_PUBLIC_URL` está definida en Vercel (si no, `robots` y `sitemap` apuntan a `localhost`).
3. Corregir `AGENTS.md` y `docs/contexto-producto-para-ideacion.md`: no existe autocompletado de dirección en el formulario.
4. Cablear Sentry en frontend y backend, y llamar a `Sentry.captureException` desde `error.tsx`.
5. Añadir imágenes OpenGraph, Twitter Cards y JSON-LD `SoftwareApplication` en la landing.
6. Cambiar el CTA «Clasificar instalación» de la barra por un texto honesto («Iniciar sesión y clasificar») o hacer un clasificador público limitado con sello de verificación.
7. Añadir municipio y autocompletado (Places) al formulario; el modelo ya tiene la columna.
8. Pasar la CSP de `Report-Only` a `enforce` tras revisar los reportes.
9. Antivirus en las subidas del portal (p. ej. ClamAV o un servicio gestionado).
10. Pago anual, cuando el precio esté decidido.
