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

---

## Resultado del Prompt B — Madrid (2026-10-01)

Resultado de una herramienta de investigación externa que abrió las fichas de `sede.comunidad.madrid`, el BOE (RITE) y el BOCM (Decreto 86/2025). **No he podido re-comprobarlo** (sin acceso a esas webs) y el JSON íntegro no está archivado en el repositorio. Los cinco ficheros siguen en `verificada_parcialmente`; `revisado_por` sigue vacío; `ultima_revision` pasa a 2026-10-01.

### Aplicado

| Hallazgo (fuente primaria, confianza alta) | Cambio |
|---|---|
| La solicitud de registro térmico (ACS, climatización), BT de FV e IRVE se presenta **ante la EICI**; la sede solo aloja la ficha y el pago de la tasa | `plataforma` corregida en 6 trámites |
| Faltaban documentos de la ficha: solicitud (IT 3.1.5 / 3.1.9), certificado de montaje (IT 3.1.6), justificante de tasa; el certificado de dirección de obra no figura | Añadidos; el de dirección de obra queda como opcional con aviso |
| Tasas publicadas (térmicas 3,12 / 6,24 / 15,60 / 31,22 / 52,04 €; AT por tramos; registro de producción 35,93 €; gas por tramos, ya correctas) | `coste_estimado` rellenado donde decía «consultar» |
| Gas: `plazo_legal_dias = 15` es el plazo del **titular** para presentar la documentación (15 días hábiles), no un plazo de resolución | Puesto a `null` y explicado en notas; añadido certificado de dirección de obra (con proyecto) y justificante de tasa |
| D50: no se adjunta documentación; la DG verifica y remite a la AGE | Nota |
| AT: autorización previa 3 meses (silencio desestimatorio), explotación 15 días; sin excedentes en AT solo comunicación previa | Nota (el plazo en días no se rellena: son meses y no sabemos si hábiles) |
| URL de RD 614/2024 apuntaba al RD 487/2022; URL de la Instrucción de autoconsumo desactualizada | Corregidas |

### Registrado en `huecos_verificacion` (no cambia la lógica; requiere decisión)

1. **FV en BT (bloqueante):** el fichero manda a la EICI toda generación BT. Según la sede, el autoconsumo con excedentes va a la EICI solo si es ≤ 500 kW y se conecta a una instalación consumidora en BT; si no, autorización de la Dirección General (Decreto 86/2025, grupo quinto). La Instrucción de 24/11/2025 no se pudo leer.
2. **FV en AT:** un único trámite; el Decreto 86/2025 distingue grupo tercero (comunicación previa) y quinto (autorización). Faltan garantía de desmantelamiento y transmisión/modificación/cierre.
3. **IRVE:** Acta XII condicionada a garaje comunitario, la ficha no lo limita; faltan IRVE en AT (grupo tercero) y de más de 3.000 kW (grupo quinto).
4. **Gas:** mapeo de «conexión de servicio» frente a «acometidas interiores»; 15 días hábiles (sede) frente a 30 días (RD 919/2006 art. 5.7); ITC-ICG 07 sin leer.
5. **70 kW exactos:** la ficha de la sede dice «igual o superior a 70 kW» para proyecto; el BOE (art. 15.1, leído directamente por la herramienta) dice «mayor que 70 kW». El fichero sigue el BOE (ADR 0002). Hay que preguntar a la DG cómo lo trata la EICI.

### RD 88/2026
En Madrid lo aplica la distribuidora al contratar; no altera ningún trámite autonómico. Puede exigir verificación y boletín en aumentos de potencia (IRVE, autoconsumo con nueva potencia contratada). Fuente del artículo: Iberley (secundaria).

---

## Resultado del Prompt B — Cataluña (2026-10-01)

Misma salvedad que Madrid: herramienta externa, no re-comprobado, JSON íntegro no archivado. **Calidad de la evidencia notablemente menor:** `canalempresa.gencat.cat`, `web.gencat.cat` y casi todo `tramits.gencat.cat` bloquearon la lectura automática; buena parte viene de fragmentos de buscador, de la FAQ de Canal Empresa y de fuentes secundarias. Por eso se aplicó poco y se anotó mucho. Niveles sin cambios; FV sigue en `en_revision`.

### Aplicado
| Hallazgo | Cambio |
|---|---|
| **Frontera de 70 kW confirmada por la propia Generalitat** (FAQ de Canal Empresa: «Fins als 70 kW, inclòs: la memòria»; «superior als 70 kW: el projecte») | Refuerza ADR 0002; descripciones de ACS y aerotermia corregidas de «5 a <70 kW» a «5 a 70 kW (ambos incluidos)» |
| URL de RD 614/2024 apuntaba al RD 487/2022 (mismo fallo que en Madrid) | Corregida en `acs.json` |
| Ficha 21526 gratuita; proyecto firmado solo para > 10 kW; DR de BT antes de la autorización de explotación | `coste_estimado`, documento opcional «proyecto_instalacion» (`condicion_documento` no se evalúa en ejecución, por eso va como opcional con aviso) y nota |
| Gas sin proyecto: la ficha dice que no presentan DR ni se inscriben en el RITSIC | Aviso con la cita literal en la nota del trámite; **la regla no se cambia** |

### Registrado en `huecos_verificacion` (decisión o fuente primaria pendiente)
1. **Umbral de registro RITSIC:** Canal Empresa indica DR desde 20 kW en calor o > 12 kW en frío; el fichero la exige desde 5 kW (ACS y aerotermia). Importante; falta la norma.
2. **Gas sin proyecto (bloqueante):** ver arriba; la ficha leída es de 2016, hay que comprobar el Decret 192/2023.
3. **FV:** el alcance de la ficha 21526 es contradictorio entre dos redacciones oficiales (¿incluye ≤ 15 kW en suelo urbanizado?); faltan reglas para autoconsumo sin excedentes hasta 500 kW, con excedentes sin compensación y la autorización de explotación de 100-500 kW; licencia de obras exenta (fuente secundaria); base legal de AAP/AAC > 500 kW (Decret llei 16/2019 mod. 22/2025).
4. **IRVE:** alcance de la inspección inicial por organismo de control; excepción de garaje residencial; regla de Barcelona desactivada.
5. **Documentos «elec1»/ELEC2/ELEC3:** no aparecen con ese nombre en fuentes catalanas.
6. **Gases fluorados** en aerotermia no modelados.
7. **Nombres y URLs:** el nombre oficial del trámite 11419 lleva el sufijo «(posada en servei, modificacions i baixa)»; no se cambia `nombre` porque las estadísticas de plazos se clavan por nombre. Las `plataforma_url` usan `canalempresa.gencat.cat`; no se pudieron abrir.

### Siguiente paso concreto
Alguien con acceso debe abrir a mano las fichas **11419, 11420 y 21526**, el FAQ de Canal Empresa y el Decret 192/2023 (ITA 9 e ITA 12). Con eso se cierran de golpe los puntos 1, 2, 3 y 4.

---

## Resultado del Prompt B — Aragón (2026-10-01)

Misma salvedad: herramienta externa, no re-comprobado, JSON íntegro no archivado. **`aragon.es/tramitador` bloqueó la lectura (robots.txt)** en los cuatro trámites (Nº 26 BT, Nº 33 gas, Nº 39 RITE y la página de energía fotovoltaica); existencia, plazos, silencio, tasas y documentos se confirmaron con el texto que aragon.es publica en buscadores, y solo hay una cita literal por fuente. Fuentes literales leídas: BOA (Orden de 27/04/2009 y su modificación de 2013; Orden ICD/302/2020), BOE (RD 919/2006; Ley 5/2024 de Aragón, BOE-A-2025-1392). Los cinco ficheros siguen en `verificada_parcialmente` (FV en `borrador_no_verificado`); `revisado_por` sigue vacío; `ultima_revision` pasa a 2026-10-01.

### Aplicado
| Hallazgo | Cambio |
|---|---|
| **Frontera de 70 kW confirmada por la ficha del Nº 39** (memoria C0006 de 5 a 70 kW; proyecto > 70 kW). Las condiciones ya eran correctas, pero el `aviso` y varias descripciones/notas decían «70 kW pasa a proyecto» | Textos corregidos en ACS y climatización (refuerza ADR 0002) |
| La norma autonómica de procedimiento del RITE es la **Orden de 27/04/2009, mod. 20/08/2013** (el fichero decía «sin norma autonómica») | `base_legal` y `fuentes` |
| `plataforma_url` del RITE apuntaba a un slug que no coincide con el publicado (y una estaba a `null`); ARA-FV-003 apuntaba a una página inexistente | Corregidas a los slugs publicados por aragon.es |
| Los `plazo_legal_dias` (15/20/30) de las comunicaciones no tienen respaldo: sin plazo de resolución, silencio positivo | Puestos a `null` y explicados en notas (RITE, BT de FV/IRVE, gas); `plazo_estimado_dias` intacto |
| Tasa 14 (Modelo 514): memoria 86,35 € + (N-1)×5,65 €; proyecto 129,50 € + (N-1)×5,65 €; solo certificado 15,35 € (BT); gas con proyecto 129,50 €. El «0 € por exención del art. 53» de FV no tenía respaldo | `coste_estimado` y nota; importes marcados como de la guía de servicios |
| Documentos de las fichas: E0002a, C0009a, C0007/UNE 60670-13 (cuando proceda), C0010a (> 70 kW, organismo de control), E0001, C0001, C0004, E0003a, justificante 514, proyecto de gas visado | Añadidos; los condicionales como opcionales (`condicion_documento` no se evalúa); «Declaración responsable» de FV pasa a opcional (no figura en la ficha) |
| ARA-FV-003: el organismo no es el Ministerio sino el Gobierno de Aragón; **umbral de 500 kW respaldado por la Ley 5/2024** (BOE-A-2025-1392) | Organismo, base legal, fuente, descripción y nota |
| ARA-GAS-003: base legal genérica y URL a `null` | Igualada con 001/002 y rellenada |
| Base legal de BT: Orden EIE/1731/2017 modificada por EIE/1132/2018 e ICD/302/2020 | FV e IRVE |

### Registrado en `huecos_verificacion` (decisión o fuente primaria pendiente)
1. **Gas, bloqueante (decisión):** ARA-GAS-001 (≤ 70 kW, ≤ 5 bar) incluye la comunicación del Nº 33, pero el RD 919/2006 dice «Salvo en el caso de las instalaciones que requieren proyecto, no es precisa ninguna comunicación» (confianza alta). **La regla no se cambia** porque altera la clasificación (el caso de referencia `aragon_gas_40kw` espera 4 trámites); se añadió un aviso en las notas del trámite. Misma situación que Cataluña.
2. **FV:** autorización de explotación para 100-500 kW sin modelar (Ley 5/2024, fuente secundaria); acceso y conexión / CAU ante la distribuidora (la ficha 2459 lo exige antes del RADNE); admisión a trámite del RDL 23/2020 para > 500 kW; certificado de OCA entre 10 y 500 kW (ITC-BT-05, Tabla 1 de BT no abierta); plazo y silencio de la autorización > 500 kW (los 90 días son supletorios estatales); reparto entre Servicio Provincial (hasta 1 MW) y DG de energía.
3. **RITE:** exención de calentadores/termos ≤ 70 kW «sumando todos los equipos» (fichero) frente a «cada uno de ellos» (guía antigua de Aragón); omisión de la inspección periódica de eficiencia energética (Modelo C0008).
4. **Legionelosis:** el Decreto 136/2005 existe pero su vigencia tras el RD 487/2022 solo consta en fuentes secundarias; el RD 487/2022 habla de PPCL/PSL, no de «PMHS» (no se renombra el trámite por las estadísticas de plazos).
5. **Gas:** faltan instalaciones comunes y acometidas > 2.000 kW; visado del proyecto frente al RD 1000/2010; justificante de titularidad en baja; inspección periódica (Tabla 1a).
6. **IRVE:** faltan inscripción en el listado de puntos de recarga, Trámite 606 (> 3.000 kW), remisión de información al Ministerio y el trámite con la distribuidora; hueco lógico con `ubicacion_irve` fuera de las cuatro cadenas. **RD 88/2026** no altera ningún trámite autonómico del fichero.
7. **Tasas y canales:** tarifas de la Tasa 14 tomadas de guías de aragon.es, no de la Ley 2/2016; DIGITA y AESSIA confirmados como canales sin aclarar si son alternativos; licencia municipal y trámites ambientales de FV sin contrastar.

### Siguiente paso concreto
Abrir a mano las fichas **Nº 26, Nº 33, Nº 39**, la página de energía fotovoltaica y la ficha 2459, y cotejar el art. 15.1.c del RITE y el art. 5.7 / ITC-ICG 07 del RD 919/2006. Con eso se cierran los puntos 1, 2 y 3.

---

## Resultado del Prompt C — subsanación conjunta Madrid · Cataluña · Aragón (2026-10-02)

27 preguntas abiertas de los Prompts B. Misma salvedad: herramienta externa, no re-comprobado, JSON íntegro no archivado; varias citas de `aragon.es`, `tramits.gencat.cat` y Canal Empresa vienen de extractos de buscador (robots.txt) y no se probó `web.archive.org`. Niveles y `revisado_por` sin cambios; `ultima_revision` pasa a 2026-10-02 en los ficheros tocados.

### Resuelto y aplicado
| Id | Hallazgo | Cambio |
|---|---|---|
| A1 | Aragón: gas individual ≤ 70 kW y ≤ 5 bar **no comunica** (Tabla 1 de la Orden de 30/03/2007; RD 919/2006) | Paso del Trámite Nº 33 fuera de `ARA-GAS-001` (v0.10.0), caso de referencia actualizado, **ADR 0003** |
| C2 | Cataluña: gas sin proyecto no presenta DR ni se inscribe en el RITSIC (ficha 11420) | `CAT-GAS-SIN-PROYECTO` pasa a trámite informativo (v1.3.0), **ADR 0003** |
| M1 | Madrid: a 70,0 kW se presenta memoria; la Resolución de 05/03/2025 (BOCM 31/03/2025) prevalece sobre la ficha 55186 | Hueco de Madrid resuelto; adenda a ADR 0002 (Madrid ya no es excepción) |
| A2 | Aragón 100-500 kW: solo autorización de explotación (DF 4.ª Ley 5/2024; recurso del TC contra otros artículos, suspensión levantada por el Auto 14/2026) | Regla nueva `ARA-FV-EXPLOTACION-100-500` (plazo, tasa y documentos sin verificar) |
| M2 | Madrid, Decreto 86/2025 leído en el BOCM: grupo tercero (sin excedentes en AT o BT con medida en AT) = comunicación previa con inspección inicial; grupo quinto (excedentes > 500 kW) = AAP + AAC + explotación | **Solo registrado** en `huecos_verificacion`: modelarlo exige un campo nuevo (excedentes, punto de medida) |
| C4 | Cataluña: Decret llei 22/2025 convalidado el 19/11/2025 (Resolució 462/XV, DOGC 9549; fuente secundaria) | Hueco actualizado; 100-500 kW sigue sin regla |
| C6 | Cataluña: «Certificat d'instal·lació elèctrica de baixa tensió» (no «ELEC1») | Etiqueta cambiada en FV e IRVE (id interno intacto) |
| A7 | RD 487/2022: PPCL (art. 8, titular) y PSL (art. 9); RD 614/2024 obliga a actualizarlos antes del 01/07/2025 | Nota y descripción del documento de ARA-ACS-003 (nombre del trámite intacto) |
| T4 | RD 88/2026 art. 38.7: la verifica la distribuidora; criterio = antigüedad del **contrato** BT (> 20 años), no de la instalación | Sin trámite autonómico nuevo; ya estaba anotado |
| T1 | RITE 15.1.c: «cada uno de ellos por separado o su suma ≤ 70 kW» | Observación en ADR 0002: lógicamente equivale a «cada equipo»; el fichero aplica la suma (más restrictivo); regla sin cambios |

### Sin cerrar (sigue haciendo falta una persona o el texto oficial)
- **C1** (umbral RITSIC, ITA 9) sigue abierto: el PDF del DOGC se truncó antes del Annex 2. Una fuente secundaria sitúa el doble umbral 20 kW (calor) / 12 kW (frío) en la antigua «Subclasse 1.1». **Se mantiene la DR desde 5 kW.**
- C3 (alcance de la ficha 21526), C5 (ITA 12), C7 (documentos de la 11419), C8 (gases fluorados), A3-A5, A8, M3, M5, T3, T5: sin fuente primaria o sin investigar.
- M4: garantía de desmantelamiento solo para instalaciones fuera de cubierta con evaluación ambiental; tasas sin verificar.

### Siguiente paso concreto
Leer el Annex 2 del Decret 192/2023 (ITA 9, 11 y 12) en el DOGC; abrir a mano las fichas 11420, 21526, Nº 33 y la Tabla 1 de Aragón para confirmar las fechas de actualización; decidir si se modela el grupo tercero/quinto de Madrid y el tramo 100-500 kW de Cataluña.

---

## Resultado del Prompt B — Andalucía, Comunitat Valenciana y Canarias (2026-10-04)

Cuatro resultados de herramienta externa (Canarias; Andalucía FV; Andalucía ACS, climatización, gas e IRVE; Comunitat Valenciana). Misma salvedad: no re-comprobado, JSON íntegro no archivado, y varias fichas (`sede.gva.es`, `juntadeandalucia.es/servicios/procedimientos`, `aragon.es`) son JavaScript o están bloqueadas, así que se leyeron por extracto de buscador. Cambios de clasificación en **ADR 0004** (y adenda del ADR 0003). Ningún nivel sube; `revisado_por` sigue vacío.

### Aplicado
| Comunidad | Hallazgo (confianza) | Cambio |
|---|---|---|
| Canarias | **FV: proyecto por encima de 10 kW**, no 100 (alta; BOC 230/2009 y guía de la sede) | Reglas `ICAN-FV-001/001B` ≤ 10 kW y nuevas `001P/001BP` (10-100 kW) |
| Canarias | Mod. IT_INS es la comunicación previa, no la memoria; IT_CI el certificado (alta; ficha 3409) | Paso y documentos renombrados, poder y autoliquidación 700-200 añadidos (clima y ACS) |
| Canarias | ERR no pertenece a la solicitud 2721; faltaban sus documentos (alta) | Documentos corregidos |
| Canarias | Gas: 30 días es plazo del titular (alta; RD 919/2006) | `plazo_legal_dias` a null; categorías A/B/C |
| Andalucía | Documentación por potencia, no por uso (alta; ficha de térmicas y Manual SGE) | ACS, FV y gas reclasificados (ADR 0004) |
| Andalucía | Sin plazo de resolución ni silencio en PUES (alta; Orden 5/03/2013) | Plazos a null, notas reescritas |
| Andalucía | Notificación sanitaria de ACS inexistente (alta; BOJA 2002 y RD 487/2022) | Trámite quitado; PPCL |
| Andalucía | Tasas 2026 (13,37 / 38,41 / 21,94 / 45,77 €; previa 320,65, construcción 272,53, explotación 253,62) y cifras sin base eliminadas (62,25 repetido, 100 y 500 estimados) | `coste_estimado` |
| Andalucía | Códigos VEAJA 9588 / 11944 / 11954, RADNE por Delegación Territorial (proc. 18494), citas del RD 244/2019 (exención 15 kW = art. 7.1.b).ii), visado solo si lo exige un Real Decreto, nueva denominación orgánica (Decretos 198 y 190/2026) | Aplicado |
| Andalucía | `andalucia/acs`: único fichero «verificada» con errores de fondo | Baja a `verificada_parcialmente` |
| C. Valenciana | Gas ≤ 70 kW sin comunicación (alta; ficha 3192 e ITC-ICG 07); 30 días = plazo del titular | Paso quitado de `CV-GAS-002`, ADR 0003/0004 |
| C. Valenciana | Umbral 500 kW = art. 123 de la Ley 6/2024 (alta); organismo = Servicio Territorial de Industria, Energía y Minas; Decreto 173/2000 regula torres y condensadores, no el ACS (alta) | Textos, fuentes y huecos |
| Varias | URL de RD 614/2024 apuntaba al RD 487/2022 | Corregida en Aragón, Asturias, Baleares, Canarias, Castilla y León y País Vasco (`acs`) |

### Registrado en `huecos_verificacion` (decisión o fuente pendiente)
- **Gas de Andalucía y Canarias:** ¿comunicación por debajo de los umbrales de proyecto? Evidencia en conflicto (ITC-ICG 07 frente a la lista de la Junta y la ficha 3905). No se quitó el paso.
- **Andalucía IRVE (alta, Guía de 2022):** falta la inspección inicial por organismo de control para recarga con proyecto, el certificado de dirección de obra, la regla de local de pública concurrencia y las ampliaciones en PUES. Decisión pendiente (requiere variables nuevas).
- **OCA > 70 kW en Andalucía (media):** la ficha de térmicas no la pide para instalaciones nuevas; se conserva el paso con aviso.
- **C. Valenciana FV:** el plazo de 180 días y el expediente ATREGI de CV-FV-004 son de la ficha 15300 (AT), no de la 20714; hay que separar por tensión de conexión.
- **Canarias:** SICAC 2713 (puesta en servicio > 100 kW; el Decreto dice 40 días con silencio estimatorio y la ficha 3 días con silencio desestimatorio), Anexo VII del Decreto 141/2009 sin leer, SICAC 6703, Orden TED/624/2026 sin efecto sobre los trámites (solo fusiona Tenerife y La Gomera).
- **Andalucía FV:** excepción de agrupación > 500 kW (DL 2/2018), garantía RD 1183/2020, permisos de acceso y conexión, tabla de tasas 7.2.1.2 completa, INEA (solo prensa).
- **Tasas de Andalucía:** su aplicación depende de una orden de entrada en operación no localizada.

### Siguiente paso concreto
Abrir a mano la ficha técnica de gas de PUES (Anexo II de la Orden de 5/03/2013) y la ficha 3905; el Anexo VII del Decreto 141/2009 en el BOC; las fichas 9588, 11944, 11954, 18494 de la Junta y la 20714 / 15300 de la Generalitat; y leer en el BOE el art. 24 del RITE. Con eso se cierran los huecos de clasificación.

---

## Resultado del Prompt B — Galicia, Castilla y León y País Vasco (2026-10-05)

Tres resultados de herramienta externa (consultados el 2026-10-04). Misma salvedad: no re-comprobado, JSON íntegro no archivado, y casi todas las fichas de `sede.xunta.gal` y `euskadi.eus` se leyeron por extracto de buscador; las de Castilla y León se leyeron directamente. Cambios de clasificación en **ADR 0005** (y adenda del ADR 0003). Ningún nivel sube; `revisado_por` sigue vacío.

### Aplicado
| Comunidad | Hallazgo (confianza) | Cambio |
|---|---|---|
| Galicia, Castilla y León | **FV: proyecto por encima de 10 kW** (alta; ficha IN614C / ITC-BT-04 §3.1) | `001` a ≤ 10 kW y reglas nuevas `GAL-FV-001P`, `CYL-FV-001P` (10-100 kW) |
| Galicia | Falta el registro IN614C; IN407B gratuito y para menos de 100 kW; resuelve la DX de Planificación Enerxética (alta/media) | Paso IN614C añadido, textos y organismo corregidos |
| Galicia, Castilla y León, País Vasco | Gas ≤ 70 kW sin registro/declaración (alta; fichas IN625A, IAPA1496 y IG) | Pasos quitados; ADR 0003/0005 |
| País Vasco | IRVE por BT-A, no GE; no hay autorización previa (alta) | Plataforma, nombre y base legal |
| País Vasco | Organismo = Delegación Territorial; RD 614/2024 es de 2 de julio; PSL = Plan Sanitario frente a Legionella; Decreto 229/2012 derogado; Nortegas (media) | Textos |
| País Vasco | Grupo segundo (≤ 1 MW) a 3 meses; tasa por el art. 132 del DLeg 1/2025 (media) | Plazo legal a null y tasa |
| Castilla y León | RISE en lugar de BOEL/«RITE»; sin «voluntario»; sin notificación sanitaria (alta) | Plataforma, nombres y notas |
| Galicia | Orden de 24/02/2010 (norma autonómica del RITE); IN622B (alta) | Base legal y nombre |
| Castilla y León, País Vasco, Galicia | La ficha no pide certificado de OCA en instalaciones nuevas (media) | Paso conservado con aviso |

### Registrado en `huecos_verificacion` (decisión o fuente pendiente)
- **Excedentes (Galicia, País Vasco; alta):** el autoconsumo sin excedentes no requiere autorización (solo registro); falta la variable.
- **Castilla y León, Decreto 25/2026 (media):** hasta 500 kW solo autorización de explotación; no se leyó el texto.
- **Galicia gas:** la ficha IN625A exige proyecto también por GLP y presión > 4 bar (el marco dice 5 bar).
- **Inspección inicial por OCA entre 25 y 100 kW (Galicia, alta)** y **OCA > 25 kW en el País Vasco** sin modelar.
- **Tasas** sin importe localizado (Galicia 32.xx; Castilla y León 308.1; País Vasco, el art. 132 solo da la tarifa básica).
- **Reorganización orgánica 2026** de Castilla y León sin confirmar.

### Siguiente paso concreto
Abrir a mano las fichas IN614C, IN407B, IN625A, la IAPA13 / IAPA1496 y el procedimiento IG del País Vasco; leer el texto íntegro del Decreto 25/2026 y las Instrucciones 2/2021 y 1/2022.


---

## Resultado del Prompt B — Murcia, Navarra y Castilla-La Mancha (2026-10-05)

Tres resultados de herramienta externa. Misma salvedad: no re-comprobado, JSON íntegro no archivado, y muchas fichas de `sede.carm.es` y `navarra.es` se leyeron por extracto de buscador (robots.txt). Cambios de clasificación en **ADR 0006**. Ningún nivel sube; `revisado_por` sigue vacío.

### Aplicado
| Comunidad | Hallazgo (confianza) | Cambio |
|---|---|---|
| Murcia, Navarra, Castilla-La Mancha | **FV: proyecto por encima de 10 kW** (alta en MUR/CLM por ITC-BT-04 §3.1; media en NAV) | `001` a ≤ 10 kW y reglas nuevas `…-FV-001P` (10-100 kW) |
| Murcia | Organismo, ficha 61 (declaración responsable) y procedimiento 19 (alta) | Nombres y organismo |
| Murcia | Certificado de gas lo emite la instaladora, no un OCA (alta) | Organismo de tres reglas |
| Navarra | Organismo actual; OF 64/2022 solo para térmicas (alta) | Organismo, nombres y base legal del gas |
| Castilla-La Mancha | Delegación Provincial, eDice y ventanillas SJE4/SJE6; gas sin proyecto sin comunicación (alta) | Plataformas, organismo y `plazo_legal_dias` a null |
| Murcia, Navarra, Castilla-La Mancha | La ficha no pide certificado de OCA en instalaciones nuevas (media) | Paso conservado con aviso |

### Registrado en `huecos_verificacion` (decisión o fuente pendiente)
- **Gas ≤ 70 kW individual (Murcia ficha 60, Navarra IRG-3):** registro previsto en la ficha pero en conflicto con la ITC-ICG 07 §3.6; no se añadió (decisión pendiente).
- **Castilla-La Mancha `CLM-FV-002`:** faltan SJ9M, SJ9T y MLG8 (necesita variable de excedentes).
- **Murcia FV:** CAU, permiso de acceso y conexión y notificación del proyecto sin modelar.
- **Navarra:** plazo y silencio de la autorización > 100 kW; Resolución 63/2025 sobre IRVE.
- **Comunes/acometidas > 2.000 kW y ampliaciones > 30 %** en gas.

### Siguiente paso concreto
Abrir a mano las fichas 60, 61 y 27 de la CARM, el modelo IRG-3 y la OF 60/2015 de Navarra, y las fichas 1002260, 1002270 y 1002272 de Castilla-La Mancha.

---

## Resultado del Prompt B — Baleares, Cantabria y Asturias (2026-10-05)

Tres resultados de herramienta externa. Misma salvedad: no re-comprobado, JSON íntegro no archivado. Casi todas las fichas (CAIB, sede.cantabria.es, sede.asturias.es) se leyeron por resumen o extracto y las citas están marcadas «paráfrasis»; ninguna ficha de Cantabria ni las de la sede de Asturias fueron legibles (robots.txt). Cambios de clasificación en **ADR 0007**. Ningún nivel sube; `revisado_por` sigue vacío.

### Aplicado
| Comunidad | Hallazgo (confianza) | Cambio |
|---|---|---|
| Baleares, Cantabria, Asturias | **FV: proyecto por encima de 10 kW** (media; ITC-BT-04 §3.1 y ficha de Asturias) | `001` a ≤ 10 kW y reglas nuevas `…-001P` (Asturias: `-P` y `-Q`) |
| Baleares | Autorización > 500 kW = SIA 216287 (ficha 2807998), no la 034 (alta) | Nombre, URL, organismo y base legal |
| Baleares | Plazos 6 meses (silencios positivo/negativo), tasas 2024, documentos 02.128/02.130/02.132 (media) | UDIT-021, UDIT-045, UDIT-013 y ficha 034 |
| Baleares | ACS colectivo no se notifica a Salud Pública (alta) | Paso quitado |
| Cantabria | Gas: el 599 exige proyecto; partición por potencia y no por uso (media) | `CANT-GBP-001` sin comunicación; nueva `CANT-GBP-003` |
| Cantabria | Art. 9 del RD 244/2019 no regula la documentación (alta) | Base legal corregida |
| Asturias | Organismo renombrado (media, fuente secundaria), plataforma BT, certificado final de obra, nombres oficiales (alta) | Textos y documentos |
| Cantabria, Asturias | Comunicación de gas sin plazo de resolución | `plazo_legal_dias` a null |

### Registrado en `huecos_verificacion`
- **Registro de IRVE en acceso público** (Baleares SIA 2306622; Cantabria 5845): falta variable.
- **RSIF en aerotermia** (Asturias, Cantabria).
- **Gas:** comunes/acometidas > 2.000 kW y ampliaciones ≥ 30 % sin modelar en las tres.
- **Baleares FV:** pasos 8-13 de la ventanilla, duplicado del orden 8 y garantía económica sin leer.
- **Asturias FV:** AAP > 100 kW solo apoyada en la ficha PDF; versión REV-02/REV-03 sin confirmar.
- **Cantabria:** umbral de autorización > 100 kW sin base autonómica; tasas 2026.

### Siguiente paso concreto
Abrir a mano las fichas 034, UDIT-013/021/045 y 2807998 de la CAIB, las fichas 599, 438, 3482 y 49 de Cantabria y las RECE0017T01, RECE0050T01, DECO0011T01 y AUTO0301T01 de Asturias.

---

## Resultado del Prompt B — La Rioja y Extremadura (2026-10-06)

Dos resultados de herramienta externa; el de Extremadura llegó cortado y se volvió a pasar completo, de modo que se aplicaron sus cinco ficheros. La Rioja completa, pero todas sus fichas se leyeron por extracto (robots.txt); las de Extremadura (juntaex.es) se leyeron directamente. Cambios en **ADR 0008**. Ningún nivel sube; `revisado_por` sigue vacío.

### Aplicado
- **FV (las dos):** proyecto por encima de 10 kW (`…-001P`).
- **Extremadura FV:** registro por CIP 5625 (no 5695), autorización de explotación 100-500 kW (CIP 5873), dos fases > 500 kW.
- **La Rioja:** tasas AUTee/IBT, plazo IBT, organismo de control habilitado, Resolución de 10/11/2010, gas ≤ 70 kW sin GN-GL.
- **Extremadura IRVE:** CIP 5625, tasa Modelo 050, plataforma AsistenteAGILE.

### Siguiente paso concreto
Abrir a mano las fichas CL y CLM, GN-GL, IBT (n=24196) y AUTee (n=24593) de La Rioja, y las fichas 5625, 5873 y 5083 (legionela ACS) de Extremadura. Con esto, las 17 comunidades han pasado el Prompt B.

- **Extremadura (completo):** térmicas y gas con proyecto por el CIP 5625 (no 5873); nueva `EXT-ACS-003` de notificación de legionela en ACS con acumulación y retorno (Orden de 01/12/2017).

---

## Verificación de fichas asistida — primera pasada (2026-10-06)

Dos prompts de lectura de fichas (grupos 1 y 2). **Cobertura baja:** solo se abrieron de verdad unas 25 fichas (Madrid D50 y 431, Canarias 3158, Baleares UDIT-045, Castilla y León IAPA 13/1468/1496, Castilla-La Mancha 1002270/1002272/1002260/eDice, Cataluña 11420, Extremadura 5625/5873/6795, Galicia IN614C/IN622B/IN625A, País Vasco gas, Aragón 2459). El resto de las fichas siguió bloqueado por robots.txt o devolvió solo la cáscara JavaScript (Andalucía, Asturias, Cantabria, Comunitat Valenciana, La Rioja, Navarra, Murcia y casi todas las de Aragón y Cataluña); archive.org no estuvo disponible.

### Resultado
- **Sin cambios de reglas.** Lo leído coincide con lo ya aplicado (tasas de Castilla-La Mancha, plazos de Madrid, alcance de UDIT-045, gas sin registro bajo el umbral de proyecto en Cataluña, Castilla y León, Castilla-La Mancha, Galicia y País Vasco). Solo se añadieron notas de confirmación en `huecos_verificacion` y se subió el parche de versión de esos ficheros.
- **Confirmado con ficha leída (alta):** gas ≤ 70 kW sin proyecto no se registra en Cataluña, Castilla-La Mancha, Galicia, Castilla y León y País Vasco; Extremadura tiene registro de IRVE de acceso público (CIP 6795, sin tasa, declaración responsable).
- **Aún sin cerrar:** Madrid (¿es exigible `MAD-GAS-SIN-PROYECTO`?), Extremadura (¿gas sin proyecto?), y las tres variables transversales en las comunidades no leídas.

### Siguiente paso concreto
Repetir la lectura solo de las fichas no abiertas, con una herramienta de navegación real (no un lector que respete robots.txt), o abrirlas a mano con `docs/normativa/checklist-verificacion-humana.md`.

---

## Verificación de fichas asistida — segunda tanda (2026-10-06)

Aportación de una persona con lectura directa de varias fichas. Las de Baleares 034 y UDIT-013 llegaron con todos los campos y cita (alta); el resto, como resumen sin citas literales, y por eso solo se registran como notas en `huecos_verificacion`.

- **Baleares 034 y UDIT-013:** nombre oficial, SIA 208129 y 207819, 180 días con silencio positivo y tasa 408.1.1 confirmados; sin cambios de reglas salvo el nombre y la referencia. La ficha 013 no distingue con y sin proyecto.
- **La Rioja:** la ficha AUTee confirma que debe estar inscrita antes la instalación de BT (IBT); paso previo aún sin modelar.
- **Navarra:** según el resumen, el Registro de Autoconsumo no se aplica a BT con menos de 100 kW (comprobar literal); el IRG-3 no basta para exigir registro bajo el umbral de proyecto; apartado PRVE y autorización por encima de 3.000 kW en IRVE.
- **País Vasco IT, Cataluña 11428 y 21526, Murcia 19:** existencia y objeto confirmados.
- La ficha 61 de Murcia siguió sin abrirse.
