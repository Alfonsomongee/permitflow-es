# ADR 0001 — El expediente guarda el payload completo; las notas normativas no llevan lenguaje de trabajo

**Fecha:** 2026-10-01 · **Estado:** aceptada · **Origen:** auditoría 2026-10-01 (F-03, F-26)

## Contexto

1. `expedientes` persistía 12 de ~48 campos del formulario. `/validar`, `/presupuesto` y cualquier recálculo reconstruían la clasificación desde esa fila: el motor devolvía 422 o «faltan datos» espurios en Madrid, Cataluña, ACS, y un plan de «revisión manual» en fotovoltaica (sin `tension`).
2. 44 textos de los JSON de Andalucía eran notas de trabajo («CIERRA lo pendiente de la Fase 0», «CORRIGE la secuencia anterior», «PENDIENTE DE VERIFICAR (no se modifica el disparador)») y se mostraban al cliente en el plan.

## Decisión

1. Columna `expedientes.parametros jsonb` (Alembic `e9a1b2c3d4f5`, Supabase `20261001090100`) con el payload exacto enviado al clasificador (`construirPayloadClasificador`). Nullable: los expedientes anteriores no lo tienen y `/validar` les responde con un mensaje explicativo (409) en lugar de un 422 inintelegible.
2. Las notas, descripciones y fuentes se reescriben en lenguaje de cliente; el contenido legal no cambia, solo se elimina la historia interna. Versión de cada fichero: +0.0.1. Regla de lint (`motor_normativo/lint.py::_lint_lenguaje_interno`) para que no vuelva a ocurrir; `huecos_verificacion` y `aviso` quedan exentos porque ahí el lenguaje de revisión es intencionado.

## Consecuencias

- Pendiente (no hecho aquí): botón «Editar datos / recalcular» que use `parametros`, y retro-relleno de expedientes antiguos.
- Cualquier campo nuevo del clasificador viaja automáticamente en `parametros` si se añade a `lib/clasificador-payload.ts` (el test de contrato ya lo exige).
