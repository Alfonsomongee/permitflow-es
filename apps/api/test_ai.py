import asyncio
from pydantic import BaseModel
from servicios.ai_client import completar_estructurado

class Prueba(BaseModel):
    capital: str
    poblacion_aprox: int

async def main():
    res = await completar_estructurado(
        "Dame capital y poblacion aproximada de Espana como JSON con claves capital y poblacion_aprox",
        Prueba,
    )
    print(res)

if __name__ == '__main__':
    asyncio.run(main())
