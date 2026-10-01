# Verificación normativa — sesión del 2026-10-01

**Estado: NO se ha cambiado ningún `nivel_verificacion`, `estado` ni `revisado_por` de los 85 ficheros.**
Esta sesión no tuvo acceso a las fuentes primarias, y marcar contenido legal como verificado sin leerlo en su fuente sería exactamente el tipo de afirmación que la auditoría del mismo día corrigió en la web.

## Límites de la sesión

| Acceso | Resultado |
|---|---|
| `boe.es`, `sede.*`, `juntadeandalucia.es`, `miteco.gob.es`… (curl y WebFetch) | **Bloqueado** por la política de red del entorno (`EGRESS_BLOCKED`) |
| Búsqueda web (solo extractos y enlaces) | Disponible; sirve para detectar cambios normativos, no para certificar el texto de un trámite |

Los 185 enlaces únicos de las reglas (42 dominios) y las 25 URLs del catálogo de ayudas no se han podido comprobar: ver «Cómo completar la verificación».

## Qué se contrastó (búsqueda web, fuentes secundarias)

| Norma / dato citado en los JSON | Resultado | Acción |
|---|---|---|
| RD 487/2022 (legionela) modificado por RD 614/2024 | Confirmado: BOE-A-2024-13422; muestras acreditadas ISO 17025, redefine «titular de la instalación» | Ninguna |
| RD 609/2026, de 22 de julio (Programa Auto+, sustituye a MOVES III) | Confirmado por varias fuentes; ayudas a la **compra de vehículo**, no a infraestructura de recarga | Ninguna (los JSON ya lo dicen así) |
| Reglamento (UE) 517/2014 (gases fluorados) | **Derogado** por el Reglamento (UE) 2024/573 (en vigor desde el 11/03/2024) | **Corregido** en `baleares/climatizacion_aerotermia.json` (v+0.0.1) |
| RD-ley 7/2026, de 20 de marzo (BOE-A-2026-6544), DF 14.ª | Modifica el RD 244/2019: proximidad hasta 5 km para FV/eólica ≤ 5 MW, figura del «gestor de autoconsumo», atención obligatoria de comercializadoras | **Revisión humana**: ningún JSON de `fotovoltaica_autoconsumo` cita el RD-ley 7/2026; hay que decidir si altera algún trámite |
| Orden TED/624/2026, de 12 de junio (BOE-A-2026-13574), SEIE canarios | **No confirmada** por la búsqueda (otras órdenes TED de junio sí aparecen) | **Verificar a mano** en Canarias FV (`norma` y `huecos_verificacion`) |

## Reformas en curso (no vigentes según lo encontrado) que conviene vigilar

- **RITE (RD 1027/2007)**: consulta pública previa del proyecto de RD de modificación cerrada el 18/04/2025; previsto para el primer semestre de 2026. No se encontró evidencia de aprobación. Varios blogs afirman que «entra en vigor en 2026» con cifras (SEER 6.1, SCOP 4.0…) que **no** se han podido contrastar con una fuente oficial: no incorporar a las reglas.
- **Reglamento de gas (RD 919/2006)**: hay un proyecto de RD que lo sustituiría (participación pública del Ministerio de Industria). No vigente.
- **REBT / ITC-BT-52**: se habla de una revisión del REBT en 2026 (proyecto técnico para recarga de más de cierta potencia, inspecciones iniciales). No se encontró un RD publicado.

El pipeline BOE (`.github/workflows/boe_pipeline.yml`, ahora corregido) debería detectar la publicación de cualquiera de estos tres textos; conviene comprobar tras el primer disparo manual (`workflow_dispatch`) que genera alertas.

## Estado real de los 85 ficheros (de los propios JSON)

| Clasificación (criterio de `lib/verificacion.ts`) | Combinaciones |
|---|---|
| Verificada sin reservas | 1 (Andalucía · ACS) |
| Verificación parcial / con observaciones | 19 |
| Borrador o genérica sin verificar | 65 |
| Con `revisado_por` identificado | **0** |

La web, la tabla de precios y los términos ya describen esta situación con cifras derivadas de los ficheros (`lib/cobertura-resumen.ts`).

## Cómo completar la verificación (necesita una persona y red)

1. Habilitar en *Network access* del entorno (o ejecutar en local) los dominios de las sedes y boletines: `boe.es`, las sedes autonómicas (`juntadeandalucia.es`, `sede.gva.es`, `caib.es`, `sede.xunta.gal`, `sede.comunidad.madrid`, `gobiernodecanarias.org`, `euskadi.eus`, `aragon.es`, `sede.cantabria.es`, `navarra.es`, `gencat.cat`, `asturias.es`, `jcyl.es`, `larioja.org`, `juntaex.es`, `jccm.es`, `carm.es`), `miteco.gob.es`, `idae.es`.
2. `cd apps/api && uv run python scripts/verificar_enlaces.py --json enlaces.json` — lista URLs rotas, que piden permiso (403/429) o que redirigen a la portada (procedimiento movido).
3. Por cada fichero, un revisor con conocimiento del sector comprueba en la fuente primaria: umbral de potencia de cada regla, organismo y plataforma de cada trámite, plazo legal y base legal citada, y deja constancia en `revisado_por` + `ultima_revision` + `huecos_verificacion`.
4. Orden sugerido: (1) FV, por el cambio del RD-ley 7/2026; (2) Orden TED/624/2026 en Canarias; (3) comunidades con más tráfico esperado (Madrid, Cataluña, Andalucía, C. Valenciana); (4) el resto.
5. Tras cada cambio: ADR en `docs/decisiones/`, `python3 scripts/generar_cobertura_normativa.py` (un test falla si se olvida) y `uv run pytest`.
