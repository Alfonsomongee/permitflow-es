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
