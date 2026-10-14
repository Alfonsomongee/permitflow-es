# Prompts de deep research para la sesión de ideación (2026-10-14)

Siete prompts, uno por eje, **autosuficientes**: cada archivo lleva al principio el mismo bloque de contexto (qué es el producto, qué existe, qué no existe, restricciones), las reglas de evidencia y un formato de salida común. Se pegan tal cual en una herramienta de investigación profunda con navegación web.

El contexto procede de `docs/contexto-producto-para-ideacion.md`, `AGENTS.md`, `docs/foundation.md` y se **contrastó con el código** (ver «Correcciones respecto a los documentos de contexto»).

## Reparto y justificación

| # | Archivo | Eje | Por qué es un eje aparte |
|---|---|---|---|
| 1 | `01-asistente-conocimiento-citas.md` | Asistente con base de conocimiento indexada y citas verificables | Es la semilla principal del fundador y exige decisiones propias (corpus, vigencia temporal, evaluación, responsabilidad). |
| 2 | `02-ahorro-rentabilidad-factura.md` | Ahorro por tecnología + análisis de factura/contrato 100x | Dos semillas del fundador que comparten datos, motor de cálculo y riesgo (cifras defendibles y RGPD). |
| 3 | `03-datos-foso-inteligencia.md` | Datos acumulativos y productos de datos | Es el foso y lo que más valora un comprador; requiere diseño de captura desde ya. |
| 4 | `04-presentacion-integraciones.md` | Presentación automática, firma, ERP y distribuidoras | Es el salto de valor mayor para el usuario y el más incierto legal y técnicamente. |
| 5 | `05-confianza-normativa.md` | Verificación continua de la normativa | Condiciona a todos los demás: con 0 ficheros revisados por una persona, nada de lo anterior es creíble. |
| 6 | `06-gtm-precios-modelo.md` | Canales, precios y monetización | Una sola persona necesita palancas de distribución baratas y un precio defendido con evidencia. |
| 7 | `07-comprabilidad-riesgos-legales.md` | Qué lo haría comprable y qué riesgos legales hay | Cierra el ciclo: convierte los demás ejes en valor adquirible y descubre los riesgos antes de una due diligence. |

Cada prompt trae una sección «Fuera de alcance» que indica qué eje cubre lo que queda fuera, para que no se solapen.

## Orden recomendado de lanzamiento

1. **Eje 5 (confianza en la normativa)** — todo lo demás se apoya en él, y es el único con un riesgo existencial hoy.
2. **Eje 3 (datos y foso)** — decide qué registrar desde ya; lo que no se registra ahora es historia irrecuperable.
3. **Eje 1 (asistente con citas)** — la semilla principal; su arquitectura depende de la respuesta del eje 5 sobre fuentes primarias.
4. **Eje 4 (presentación e integraciones)** — alto valor, pero con la respuesta legal puede cambiar el alcance; mejor saberlo pronto.

Después, en paralelo: ejes 2, 6 y 7. El eje 7 es el último en sentido estricto, porque puntúa lo que salga de los demás.

## Cómo fusionar los resultados

Cada informe termina con un bloque JSON del catálogo de ideas con los mismos campos. Se pueden concatenar y ordenar por `impacto_1_a_5 × viabilidad_1_a_5`, filtrando por `confianza_en_la_evidencia`. Los apartados «Lo que no sé» y «Dependencias y choques» sirven para detectar contradicciones entre ejes.

## Correcciones respecto a los documentos de contexto

- `AGENTS.md` y `docs/contexto-producto-para-ideacion.md` dicen que existe autocompletado de dirección con Google Places en el formulario. **No existe en el código**: el paso 1 solo tiene un desplegable de CCAA y no pide municipio. Los prompts lo reflejan así. Hay que corregir esos dos documentos.
- El cómputo de ficheros por nivel difiere entre documentos (1/19/65 en `verificacion-2026-10-01.md`; 0/20/65 en el contexto). Contando los JSON: **0 con revisor humano; 61 en `borrador_no_verificado`; unos 24 con verificación parcial**. Los prompts usan esas cifras aproximadas.

El contraste con la auditoría externa está en `contraste-auditoria.md`.
