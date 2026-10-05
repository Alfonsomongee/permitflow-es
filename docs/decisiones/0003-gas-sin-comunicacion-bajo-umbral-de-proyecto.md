# ADR 0003 — Gas: sin comunicación ni declaración responsable por debajo de los umbrales de proyecto (Aragón y Cataluña)

**Fecha:** 2026-10-02 · **Estado:** aceptada (revisable si una lectura de las fichas completas lo contradice) · **Origen:** Prompt C de verificación normativa

## Contexto

Los ficheros de gas de Aragón y Cataluña modelaban un trámite de puesta en servicio también para las instalaciones receptoras que no requieren proyecto:

- Aragón, `ARA-GAS-001` (individual ≤ 70 kW y ≤ 5 bar): comunicación del Trámite Nº 33.
- Cataluña, `CAT-GAS-SIN-PROYECTO`: declaración responsable e inscripción en el RITSIC.

El Prompt B ya había señalado el conflicto y lo dejamos como hueco bloqueante sin tocar la regla, porque cambia la clasificación.

## Evidencia

- **RD 919/2006 (ITC-ICG 07)**: «Salvo en el caso de las instalaciones que requieren proyecto, no es precisa ninguna comunicación a la administración» (reproducida literalmente en las fichas de Asturias y de la Generalitat Valenciana).
- **Aragón**: la Tabla 1 (Orden de 30/03/2007) solo obliga a comunicar las individuales de más de 70 kW, las comunes y acometidas interiores de más de 2.000 kW y las alimentadas a más de 5 bar; «las instalaciones receptoras no recogidas en esta tabla no son objeto de comunicación a la Administración». Extracto de buscador de `aragon.es` (la ficha y el PDF bloquearon la lectura directa); confianza alta.
- **Cataluña**: ficha 11420: las instalaciones que «no requereixin projecte, no han de presentar la declaració responsable i no s'inscriuen al RITSIC». Extracto de buscador de `tramits.gencat.cat` y Canal Empresa; no se vio la fecha de actualización; confianza alta.

## Decisión

- `ARA-GAS-001` deja de incluir el Trámite Nº 33 (queda memoria, certificado y alta con la distribuidora) y una nota explica el motivo. Versión 0.10.0. `ARA-GAS-002` y `ARA-GAS-003` no cambian.
- `CAT-GAS-SIN-PROYECTO` pasa a un trámite informativo («sin trámite ante la Administración») con certificado de instalación y croquis a disposición del titular. Versión 1.3.0. `CAT-GAS-CON-PROYECTO` no cambia.
- Caso de referencia `aragon_gas_40kw`: 4 → 3 trámites y 26 → 16 días; marcado «pendiente de revisión humana».
- Tests nuevos en `tests/test_gas_sin_comunicacion_y_explotacion_aragon.py`.

## Consecuencias y riesgo

- Un usuario con gas ≤ 70 kW verá un trámite menos. Si la ficha completa dijera otra cosa, el riesgo sería ocultar una obligación; por eso las notas explican el criterio y se conserva el alta con la distribuidora.
- No se modelan aún las comunes y acometidas > 2.000 kW ni las ampliaciones > 30 % (ver `huecos_verificacion`).
- Revertible con `git revert`.
- Pendiente: cotejar a mano la ficha 11420, la Tabla 1 y el art. de la ITA 11 del Decret 192/2023 (ver `docs/normativa/verificacion-2026-10-01.md`).

## Adenda 2026-10-04 (Prompt B Comunitat Valenciana)

La ficha 3192 de la Generalitat reproduce la ITC-ICG 07 («no es precisa ninguna comunicación» salvo instalaciones con proyecto): `CV-GAS-002` pierde el paso de comunicación (ver ADR 0004). **Andalucía y Canarias quedan sin cambiar**: la ficha de Canarias (3905) no distingue instalaciones con y sin proyecto y la Junta de Andalucía lista el gas entre las comunicables por PUES; ninguna fuente autonómica permite descartar el trámite todavía.

## Adenda 2026-10-05 (Prompt B Galicia, Castilla y León y País Vasco)

Tres comunidades más lo confirman con la ficha oficial: IN625A (Galicia), IAPA1496 (Castilla y León) y el procedimiento IG de euskadi.eus (País Vasco) cubren solo instalaciones **con proyecto**. Se quitan los pasos de registro/declaración para el tramo ≤ 70 kW (ver ADR 0005). Ya son **siete** las comunidades corregidas (Aragón, Cataluña, Comunitat Valenciana, Galicia, Castilla y León y País Vasco, más Madrid con otra redacción); siguen sin cambio Andalucía y Canarias.

