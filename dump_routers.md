

### File: apps/api/routers\clasificador.py

```
from fastapi import APIRouter, HTTPException, status
from schemas.clasificador import ClasificadorInput, ClasificadorOutput
from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError

router = APIRouter(prefix="/api/v1/clasificador", tags=["clasificador"])
clasificador = Clasificador()

@router.post("", response_model=ClasificadorOutput)
async def clasificar_instalacion(params: ClasificadorInput):
    try:
        resultado = clasificador.clasificar(params)
        return resultado
    except NormativaNoEncontradaError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al clasificar: {str(e)}"
        )

```


### File: apps/api/routers\documentos.py

```
from fastapi import APIRouter, HTTPException, Response

from documentos import VerticalNoSoportadoError, generar_documento
from documentos.schemas import GenerarDocumentoInput

router = APIRouter(prefix="/api/v1/documentos", tags=["documentos"])


@router.post("/generar")
def generar(payload: GenerarDocumentoInput) -> Response:
    """Genera un documento a partir del expediente. Stateless: los datos llegan
    en el payload (autenticación y carga desde Supabase las hace Next.js)."""
    try:
        contenido, media_type, filename = generar_documento(payload)
    except VerticalNoSoportadoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 — error de render → 500 con detalle
        raise HTTPException(status_code=500, detail=f"Error generando documento: {exc}")

    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

```


### File: apps/api/routers\validador.py

```
from fastapi import APIRouter, HTTPException

from motor_normativo.excepciones import NormativaNoEncontradaError
from motor_normativo.validador import Validador, ValidadorOutput
from schemas.clasificador import ClasificadorInput

router = APIRouter(prefix="/api/v1/validador", tags=["validador"])

_validador = Validador()


@router.post("", response_model=ValidadorOutput)
def validar(params: ClasificadorInput) -> ValidadorOutput:
    """Comprobaciones de coherencia pre-presentación. Stateless, como el clasificador."""
    try:
        return _validador.validar(params)
    except NormativaNoEncontradaError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

```


### File: apps/api/routers\__init__.py

```

```
