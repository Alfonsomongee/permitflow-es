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
