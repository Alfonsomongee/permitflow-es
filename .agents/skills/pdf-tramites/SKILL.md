# Skill: Generación de Documentos PDF

## Cuándo cargar esta skill
Cuando la tarea implique cualquiera de estas acciones:
- Modificar o extender `servicios/pdf_generator.py`
- Añadir un nuevo tipo de documento o formulario
- Trabajar con templates de memorias técnicas
- Debuggear problemas de generación o formato de PDFs
- Añadir formularios oficiales de nuevas comunidades autónomas

---

## Qué genera el sistema

Tres tipos de documentos, con lógica distinta cada uno:

### 1. Formularios oficiales rellenados
PDFs oficiales de organismos (Junta de Andalucía, MITECO, etc.)
con los campos rellenados automáticamente a partir de los datos del expediente.
**Tecnología:** pypdf para leer el PDF original + rellenar campos AcroForm.

### 2. Memorias técnicas tipo
Documentos generados desde cero siguiendo la estructura exigida por cada
tipo de instalación y comunidad autónoma.
**Tecnología:** reportlab para generación completa desde Python.

### 3. Checklists de documentación
Listas de verificación en PDF con los documentos requeridos para cada
trámite, con casillas marcables.
**Tecnología:** reportlab (simple, sin lógica compleja).

---

## Estructura de archivos

```
apps/api/
├── servicios/
│   └── pdf_generator.py        # Clase principal PdfGenerator
├── templates/
│   └── pdf/
│       ├── formularios/        # PDFs oficiales originales (solo lectura)
│       │   ├── AND-CIE-BT-2021.pdf
│       │   ├── MITECO-RAC-001.pdf
│       │   └── ...
│       ├── memorias/           # Templates de memorias técnicas
│       │   ├── base_memoria.py # Template base reportlab
│       │   ├── fotovoltaica_memoria.py
│       │   └── climatizacion_memoria.py
│       └── assets/
│           ├── logo_permitflow.png
│           └── fonts/
│               └── Inter-Regular.ttf
└── tests/
    └── test_pdf_generator.py
```

---

## API de PdfGenerator

```python
# servicios/pdf_generator.py

class PdfGenerator:

    def generar_formulario(
        self,
        formulario_ref: str,       # ej: "AND-CIE-BT-2021"
        datos_expediente: dict,    # datos del expediente del clasificador
        datos_proyecto: dict,      # datos específicos introducidos por el usuario
    ) -> bytes:
        """
        Rellena un formulario oficial con los datos del expediente.
        Devuelve el PDF como bytes para guardar en Supabase Storage.
        Lanza FormularioNoEncontradoError si el formulario_ref no existe.
        Lanza CamposInsuficientesError con lista de campos faltantes.
        """

    def generar_memoria(
        self,
        tipo_instalacion: str,
        comunidad: str,
        datos_proyecto: dict,
    ) -> bytes:
        """
        Genera una memoria técnica tipo desde cero.
        Devuelve el PDF como bytes.
        """

    def generar_checklist(
        self,
        tramites: list[Tramite],
    ) -> bytes:
        """
        Genera un checklist PDF con todos los documentos requeridos
        para los trámites del expediente.
        """
```

---

## Mapeo datos_proyecto → campos PDF

Cada formulario tiene un mapa que traduce las claves de `datos_proyecto`
a los nombres de campo AcroForm del PDF oficial. Este mapa vive en
`templates/pdf/formularios/` como un JSON paralelo al PDF:

```json
// AND-CIE-BT-2021.map.json
{
  "nombre_instalador": "Text_NombreInstalador",
  "nif_instalador": "Text_NIFInstalador",
  "numero_carnet": "Text_NumeroCarnet",
  "potencia_kw": "Text_PotenciaKW",
  "tension_v": "Text_TensionV",
  "direccion_instalacion": "Text_Direccion",
  "municipio": "Text_Municipio",
  "provincia": "Text_Provincia",
  "fecha_instalacion": "Text_FechaInstalacion",
  "uso": "Dropdown_Uso"
}
```

Si un campo del PDF no tiene equivalente en `datos_proyecto`, rellenar
con cadena vacía y añadir a la lista de `campos_vacios` del resultado.

---

## Campos insuficientes — comportamiento esperado

Cuando faltan datos para rellenar el formulario completamente:

```python
# NO lanzar excepción — devolver resultado parcial con advertencia
return {
    "pdf_bytes": pdf_parcialmente_rellenado,
    "completo": False,
    "campos_vacios": ["nif_instalador", "numero_carnet"],
    "mensaje": "El documento está incompleto. Faltan: NIF del instalador, Número de carnet."
}

# Solo lanzar CamposInsuficientesError si faltan campos OBLIGATORIOS
# que hacen el documento técnicamente inválido (ej: dirección de instalación)
```

---

## Uso de Claude API para campos ambiguos

Cuando el valor de un campo no puede mapearse directamente (ej: un campo
de "descripción del uso" que admite texto libre), usar Claude para generarlo:

```python
# En pdf_generator.py
async def _rellenar_campo_texto_libre(
    self,
    nombre_campo: str,
    descripcion_campo: str,
    datos_proyecto: dict,
) -> str:
    prompt = f"""
    Rellena el campo "{nombre_campo}" de un formulario oficial español de instalaciones.
    Descripción del campo: {descripcion_campo}
    
    Datos disponibles del proyecto:
    {json.dumps(datos_proyecto, ensure_ascii=False, indent=2)}
    
    Responde SOLO con el texto a introducir en el campo.
    Máximo 200 caracteres. Usa terminología técnica oficial española.
    No uses abreviaturas no estándar.
    """
    # Llamar a claude_client.py
    return await self.claude_client.completar(prompt, max_tokens=100)
```

---

## Convenciones de generación con reportlab

```python
# Paleta de colores (usar siempre estos, no otros)
COLOR_PRIMARY = HexColor('#1B4FD8')
COLOR_TEXT = HexColor('#111827')
COLOR_TEXT_SECONDARY = HexColor('#6B7280')
COLOR_BORDER = HexColor('#E5E7EB')
COLOR_BG_LIGHT = HexColor('#F9FAFB')

# Fuentes registradas al inicio
pdfmetrics.registerFont(TTFont('Inter', 'templates/pdf/assets/fonts/Inter-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', 'templates/pdf/assets/fonts/Inter-Bold.ttf'))

# Márgenes estándar (en puntos, 1 punto = 0.352mm)
MARGEN_LATERAL = 56   # ~2cm
MARGEN_SUPERIOR = 72  # ~2.5cm
MARGEN_INFERIOR = 56  # ~2cm

# Tamaño de página: A4
ANCHO, ALTO = A4  # 595.27 x 841.89 puntos

# Header estándar en todas las memorias generadas
def _dibujar_header(canvas, doc):
    """Header con logo PermitFlow ES + referencia del expediente."""
    canvas.saveState()
    canvas.drawImage('templates/pdf/assets/logo_permitflow.png', 
                     MARGEN_LATERAL, ALTO - 50, width=120, height=30)
    canvas.setFont('Inter', 8)
    canvas.setFillColor(COLOR_TEXT_SECONDARY)
    canvas.drawRightString(ANCHO - MARGEN_LATERAL, ALTO - 35, 
                           f"Expediente: {doc.expediente_ref}")
    canvas.restoreState()
```

---

## Storage de documentos generados

Los PDFs generados se guardan en Supabase Storage, nunca en disco local:

```python
# Bucket structure en Supabase Storage:
# permitflow-docs/
# └── {organizacion_id}/
#     └── {expediente_id}/
#         ├── formularios/
#         │   └── AND-CIE-BT-2021_20260617.pdf
#         ├── memorias/
#         │   └── memoria_tecnica_20260617.pdf
#         └── checklists/
#             └── checklist_tramites_20260617.pdf

# Naming convention:
# {formulario_ref}_{YYYYMMDD}.pdf
# memoria_{tipo_instalacion}_{YYYYMMDD}.pdf
# checklist_tramites_{YYYYMMDD}.pdf
```

---

## Tests obligatorios

```python
# tests/test_pdf_generator.py

def test_generar_checklist_retorna_bytes():
    """El checklist siempre debe generarse aunque falten datos."""

def test_formulario_campos_vacios_no_lanza_excepcion():
    """Campos opcionales vacíos producen PDF parcial, no error."""

def test_formulario_referencia_inexistente_lanza_error():
    """FormularioNoEncontradoError si formulario_ref no existe."""

def test_memoria_fotovoltaica_contiene_secciones_obligatorias():
    """La memoria generada debe contener: objeto, normativa aplicable,
    descripcion instalacion, caracteristicas tecnicas, conclusiones."""

def test_pdf_generado_es_pdf_valido():
    """Verificar que los bytes generados son un PDF válido con pypdf."""
```

---

## Formularios a implementar (por orden de prioridad)

| Ref | Nombre | Organismo | CA | Estado |
|---|---|---|---|---|
| AND-CIE-BT-2021 | Certificado de Instalación Eléctrica BT | Junta Andalucía | AND | Pendiente |
| MITECO-RAC-001 | Registro Autoconsumo | MITECO | Todas | Pendiente |
| AND-AAP-2020 | Autorización Admin. Previa | Junta Andalucía | AND | Pendiente |
| MAD-CIE-2023 | CIE Madrid | CAM | MAD | Fase 2 |
| CAT-CIE-2022 | CIE Cataluña | Generalitat | CAT | Fase 2 |

Descargar los PDFs oficiales y depositarlos en `templates/pdf/formularios/`
antes de implementar el mapeo de campos.
