# Skill: Motor Normativo

## Cuándo cargar esta skill
Cuando la tarea implique cualquiera de estas acciones:
- Añadir o modificar reglas en `motor_normativo/reglas/**/*.json`
- Modificar `motor_normativo/clasificador.py` o `validador.py`
- Interpretar un fragmento de normativa (BOE, BOJA, DOGC, etc.)
- Escribir tests relacionados con el clasificador
- Revisar o actualizar la base legal de un trámite existente

---

## Qué es el motor normativo

Es el núcleo diferencial del producto. Contiene el conocimiento técnico-legal
que permite clasificar automáticamente los trámites necesarios para cualquier
instalación técnica en España.

Funciona como un árbol de decisión versionado: dado un conjunto de parámetros
de entrada (tipo de instalación, comunidad autónoma, potencia, uso...), evalúa
condiciones y devuelve la lista ordenada de trámites aplicables con su base
legal, organismo responsable y documentación requerida.

**Regla de oro: cada trámite en el sistema debe tener su base legal explícita.
Sin base legal, no existe en el motor.**

---

## Schema obligatorio de los JSONs de reglas

Todo archivo en `motor_normativo/reglas/` debe seguir esta estructura.
Validar contra `_schema.json` antes de commitear.

```json
{
  "tipo_instalacion": "string — ver tipos válidos abajo",
  "comunidad": "string — ver comunidades válidas abajo",
  "version": "string — semver: MAJOR.MINOR.PATCH",
  "ultima_revision": "string — fecha ISO 8601: YYYY-MM-DD",
  "revisado_por": "string — quién validó este JSON",
  "fuentes": [
    "string — RD/Decreto/Artículo exacto"
  ],
  "reglas": [
    {
      "id": "string — formato: {CA}-{TIPO}-{NNN} ej: AND-FV-001",
      "descripcion": "string — descripción legible de la condición",
      "condicion": "string — expresión evaluable: ver sintaxis abajo",
      "tramites": [
        {
          "orden": "integer — empezando en 1",
          "nombre": "string — nombre oficial del trámite",
          "organismo": "string — organismo receptor exacto",
          "base_legal": "string — norma + artículo exacto",
          "plazo_estimado_dias": "integer — plazo real, no legal",
          "plazo_legal_dias": "integer | null — plazo legal si existe",
          "documentos_requeridos": ["string — refs a templates"],
          "formulario_ref": "string | null — ref al PDF oficial",
          "paralelo_con": ["string | null — IDs de trámites que pueden hacerse simultáneamente"],
          "notas": "string — advertencias, excepciones, casos edge",
          "obsoleta": "boolean — false por defecto",
          "obsoleta_desde": "string | null — fecha si obsoleta: true"
        }
      ]
    }
  ]
}
```

---

## Tipos de instalación válidos

```
fotovoltaica_autoconsumo
fotovoltaica_vertido_red
eolica_pequeña
climatizacion_aerotermia
climatizacion_split
climatizacion_vrf
climatizacion_industrial
acs_solar_termica
acs_bomba_calor
gas_baja_presion
gas_media_presion
baja_tension_industria
baja_tension_residencial
media_tension
```

Añadir nuevos tipos requiere actualizar también:
- `motor_normativo/clasificador.py` (enum TipoInstalacion)
- `schemas/clasificador.py` (validación Pydantic)
- Este archivo

---

## Comunidades autónomas válidas

```
andalucia | aragon | asturias | baleares | canarias | cantabria
castilla_la_mancha | castilla_leon | cataluna | ceuta | comunidad_valenciana
extremadura | galicia | la_rioja | madrid | melilla | murcia | navarra
pais_vasco
```

---

## Sintaxis de condiciones

Las condiciones se evalúan en Python con `eval()` sobre un dict de parámetros.
Usar solo operadores seguros: `AND`, `OR`, `NOT`, `==`, `!=`, `<`, `<=`, `>`, `>=`.

```
# Variables disponibles en el contexto de evaluación:
potencia_kw        # float
superficie_m2      # float | None
uso                # 'residencial' | 'terciario' | 'industrial'
municipio_capital  # bool — True si es capital de provincia
zona_rural         # bool
red_distribucion   # 'endesa' | 'iberdrola' | 'naturgy' | 'e-redes' | 'other'

# Ejemplos válidos:
"potencia_kw <= 10 AND uso == 'residencial'"
"potencia_kw > 10 AND potencia_kw <= 100"
"uso == 'industrial' AND potencia_kw > 50"
"True"  # regla que aplica siempre para esta combinación tipo+CA
```

---

## Versionado de los JSONs

- **PATCH** (1.0.0 → 1.0.1): corrección de dato erróneo, fix de plazo, fix de base legal
- **MINOR** (1.0.0 → 1.1.0): nueva regla añadida, nuevo trámite en regla existente
- **MAJOR** (1.0.0 → 2.0.0): cambio de estructura, eliminación de regla, cambio normativo que invalida reglas anteriores

Nunca eliminar una regla. Si queda obsoleta: `"obsoleta": true, "obsoleta_desde": "YYYY-MM-DD"`.

---

## Proceso para añadir normativa nueva

Cuando llega un cambio normativo (nuevo RD, nueva orden autonómica):

1. **Identificar alcance**: qué tipos de instalación y qué CCAA afecta
2. **Leer la norma original**: siempre desde la fuente oficial (BOE, diario autonómico)
3. **Identificar qué trámites cambian**: nuevos, modificados, eliminados
4. **Actualizar el JSON correspondiente**: incrementar versión, actualizar `ultima_revision`
5. **Crear ADR**: en `docs/decisiones/YYYY-MM-DD-nombre-cambio.md`
6. **Actualizar o añadir tests**: en `tests/test_clasificador.py`
7. **Commitear con formato**: `feat(normativa): update AND-FV fotovoltaica RD XXX/2026`

---

## Proceso para interpretar un PDF normativo con Claude API

Cuando hay que procesar un PDF del BOE para extraer trámites, usar este prompt
en `servicios/claude_client.py`:

```python
PROMPT_INTERPRETACION_NORMATIVA = """
Eres un experto en normativa de instalaciones técnicas en España.
Tienes conocimiento profundo del RITE, REBT, CTE, RD 244/2019, RD 1183/2020
y la normativa autonómica de instalaciones.

Analiza el siguiente fragmento normativo y extrae en JSON:

{
  "norma": "nombre oficial de la norma",
  "fecha_publicacion": "YYYY-MM-DD",
  "entrada_vigor": "YYYY-MM-DD",
  "tipos_instalacion_afectados": ["lista de tipos"],
  "comunidades_afectadas": ["lista o 'todas'"],
  "tramites_nuevos": [
    {
      "nombre": "nombre del trámite",
      "organismo": "organismo receptor",
      "base_legal": "artículo exacto",
      "condicion_aplicacion": "cuándo aplica",
      "documentos_requeridos": ["lista"]
    }
  ],
  "tramites_modificados": [...],
  "tramites_eliminados": [...],
  "notas_interpretacion": "advertencias o ambigüedades detectadas"
}

Si algún campo no puede determinarse con certeza, usar null y explicar en notas_interpretacion.
Responde SOLO con el JSON, sin texto adicional.

Fragmento normativo:
{texto_normativa}
"""
```

---

## Tests obligatorios por cada regla

Por cada regla `{CA}-{TIPO}-{NNN}` en un JSON, debe existir al menos un test
en `tests/test_clasificador.py` que verifique:

```python
def test_AND_FV_001_residencial_menos_10kw():
    """Fotovoltaica residencial <= 10kW en Andalucía debe requerir
    comunicación previa a distribuidora como primer trámite."""
    resultado = clasificador.clasificar(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="andalucia",
        potencia_kw=8.0,
        uso="residencial"
    )
    assert len(resultado.tramites) > 0
    assert resultado.tramites[0].nombre == "Comunicación previa a la distribuidora"
    assert resultado.tramites[0].orden == 1
    assert "RD 244/2019" in resultado.tramites[0].base_legal
```

---

## Fuentes normativas de referencia

| Fuente | URL | Frecuencia de revisión |
|---|---|---|
| BOE API | https://api.boe.es/api.php | Semanal |
| BOJA (Andalucía) | https://www.juntadeandalucia.es/boja | Semanal |
| DOGC (Cataluña) | https://dogc.gencat.cat | Semanal |
| BOCM (Madrid) | https://www.bocm.es | Semanal |
| IDAE normativa | https://www.idae.es/normativa | Mensual |
| CNMC resoluciones | https://www.cnmc.es/resoluciones | Mensual |

---

## Archivos relacionados

```
apps/api/motor_normativo/
├── clasificador.py        # Lógica principal — leer antes de modificar
├── validador.py           # Validación de inputs y outputs
└── reglas/
    ├── _schema.json       # Schema JSON de validación
    └── andalucia/
        ├── fotovoltaica.json
        ├── climatizacion.json
        └── acs.json

apps/api/tests/
└── test_clasificador.py

docs/decisiones/           # ADRs de cada cambio normativo
docs/normativa/            # PDFs originales descargados
```
