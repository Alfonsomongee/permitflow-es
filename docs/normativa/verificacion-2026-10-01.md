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
| RD-ley 7/2026, de 20 de marzo (BOE-A-2026-6544), DF 14.ª | Modifica el RD 244/2019 solo en el art. 3.g).iii (proximidad hasta 5 km para FV/eólica ≤ 5 MW) y el art. 4.5 (cambio de modalidad). **No** toca los umbrales de 15 kW, 100 kW ni el registro | Resuelto: no altera los trámites de legalización (ver «Resultado del Prompt A») |
| Orden TED/624/2026, de 12 de junio (BOE-A-2026-13574), SEIE canarios | **Confirmada** por el Prompt A (BOE n.º 152 de 23/06/2026; 5 sistemas aislados) — ver «Resultado del Prompt A» | Ninguna: la cita de Canarias es correcta |

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

---

## Resultado del Prompt A (marco estatal) — aplicado el 2026-10-01

Salida íntegra archivada en `investigacion-marco-estatal-2026-10-01.md`. **Procede de una herramienta de investigación externa; no he podido re-comprobarla** (sigo sin acceso a `boe.es`). Las citas marcadas por la herramienta como «primarias» incluyen casos cuyo texto literal salió de una web secundaria (p. ej. el art. 15 del RITE vía Ecotec Ingenieros); lo señalo abajo.

### Confirmado y coherente con los ficheros

| Dato | Contraste con el repositorio |
|---|---|
| RD 244/2019: exención de acceso y conexión ≤ 15 kW en suelo urbanizado (art. 7.1.b.ii) y compensación simplificada ≤ 100 kW (art. 4.2) siguen vigentes | Las reglas FV usan 15 / 100 kW (2 y 14 comunidades) |
| RD 1183/2020: art. 17 sin modificar; procedimiento abreviado ≤ 15 kW | Coherente |
| ITC-BT-04: proyecto para recarga si P > 50 kW, exterior > 10 kW o modo 4; si no, MTD (fuentes oficiales autonómicas, no el consolidado) | **17 de 17** ficheros IRVE usan 10 y 50 kW |
| RITE: proyecto > 70 kW; memoria 5–70 kW; sin documentación < 5 kW; consolidado sin cambios desde 02/08/2022; la reforma es solo un proyecto | 17 de 17 usan 5 kW; 70 kW → ver corrección abajo |
| RD 487/2022 modificado por RD 614/2024 (BOE-A-2024-13422): en vigor 04/07/2024 | Coherente (fuente secundaria) |
| RD 115/2017 sigue aplicándose; el RD que lo sustituiría es proyecto; Reglamento (UE) 2024/573 | Coherente con la corrección de Baleares |
| RD 609/2026 (Programa Auto+, BOE-A-2026-16010): solo compra de vehículos; no se pudo confirmar que cubra puntos de recarga | Coherente (`catalogo_ayudas.py` y Andalucía IRVE) |
| MOVES III cerró solicitudes el 31/12/2025; RD 477/2021 el 31/12/2023 | El catálogo ya lo decía; **el trámite genérico de ayudas citaba el RD 477/2021 como marco vigente → corregido** |
| Orden TED/624/2026 existe (BOE-A-2026-13574, BOE 23/06/2026) | Canarias FV correcta |
| Reglamento de gas: proyecto de sustitución del RD 919/2006 sin publicar | RD 919/2006 sigue vigente; umbrales de la ITC-ICG 07 **no verificados** |

### Cambios hechos a partir del Prompt A

1. **Frontera de 70 kW del RITE (ADR 0002).** Aragón, Baleares, Cataluña y Madrid exigían proyecto desde 70,0 kW (`>= 70`); el art. 15.1 exige proyecto solo por encima de 70 kW. Corregidos los 8 ficheros de ACS y climatización, con test que cubre los 34.
2. **Trámite genérico de ayudas**: ya no presenta el RD 477/2021 como base legal vigente.
3. **Ley 24/2013, art. 53.3**: Andalucía FV y Asturias FV citan el 53.3 para un umbral de 100 kW; la investigación indica que el 53.3 habilita hasta 500 kW y que el 100 kW es del art. 9. No he cambiado las reglas (solo un cotejo en boe.es lo resuelve); lo he añadido a `huecos_verificacion` de ambos ficheros.

### Pendiente (no resuelto por el Prompt A)

- Silencio administrativo en las autorizaciones del art. 53 (Ley 24/2013) y Título VII del RD 1955/2000; precepto reglamentario que materializa la exención hasta 500 kW.
- Umbrales de la ITC-BT-04 contra el consolidado de boe.es (la herramienta los tomó de sedes autonómicas).
- Umbrales de proyecto/certificado de la ITC-ICG 07 (gas).
- **RD 88/2026** (Reglamento general de suministro, BOE-A-2026-3212, en vigor desde 12/02/2026): exige verificación de instalaciones BT con más de 20 años en aumentos de potencia y matiza el CIE en cambios de titularidad. **Ninguno de los 85 ficheros lo cita**; hay que decidir si añade un trámite o una advertencia en FV/IRVE con aumento de potencia.
- Norma que modificó el RD 1183/2020 el 12/02/2026 y la que modificó el RD 919/2006 el 04/04/2025.
- Si el texto «gestor de autoconsumo» (fuentes secundarias) existe y en qué norma.
- Siguiente paso: **Prompt B por comunidad** (17 ejecuciones).
