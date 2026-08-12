"""Rate limiting por IP compartido entre endpoints públicos.

Extraído de routers/simulador.py (donde vivía duplicado) para poder
reutilizarlo en routers/contacto.py sin copiar la lógica de nuevo.
Comportamiento sin cambios respecto al original.
"""

from redis.asyncio import Redis
from fastapi import HTTPException, Request

# ---------------------------------------------------------------------------
# Redis — conexión de vida larga, creada una vez en el lifespan de la app
# (main.py) y reutilizada por todas las peticiones, en vez de abrir y cerrar
# una conexión nueva en cada llamada a /contacto, /newsletter y
# /simulador/* como se hacía antes (auditoría 2026-08-06, B-13; plan de
# acción consolidado 2026-08-12, P-14).
# ---------------------------------------------------------------------------

async def get_redis(request: Request) -> Redis:
    return request.app.state.redis


# ---------------------------------------------------------------------------
# Rate limiting atómico
# ---------------------------------------------------------------------------

async def rate_limit(redis: Redis, ip: str, key_prefix: str, max_req: int, ttl: int = 3600):
    """Rate limit atómico con INCR + EXPIRE.

    El INCR crea la clave si no existe (valor inicial 1).
    Si count==1, establecemos TTL (primera petición en la ventana).
    Si count > max_req, rechazamos.

    Sin race condition: INCR es atómico en Redis.
    Sin clave sin TTL: el expire se aplica SIEMPRE en la primera petición.
    """
    key = f"rate:{key_prefix}:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, ttl)
    if count > max_req:
        raise HTTPException(
            status_code=429,
            detail=f"Has superado el límite de {max_req} peticiones por hora. Inténtalo más tarde."
        )


def get_real_ip(request: Request) -> str:
    """Obtener la IP real del cliente.

    NOTA: ProxyHeadersMiddleware de uvicorn debe estar configurado con
    --proxy-headers y --forwarded-allow-ips en Railway/Vercel.
    Con ese middleware activo, request.client.host ya contiene la IP real.
    Sin él, request.client.host es la IP del balanceador (todos comparten cuota).

    Verificar tras el deploy que la IP logueada en las primeras peticiones
    es la del cliente real, no 10.x.x.x o 172.x.x.x.
    """
    return request.client.host if request.client else "unknown"
