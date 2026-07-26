import asyncio
import os
import json
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

async def main():
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, creado_en, actualizado_en, plan_tramitacion::text FROM expedientes WHERE comunidad = 'madrid' ORDER BY creado_en DESC LIMIT 5"))
        rows = result.fetchall()
        print(json.dumps([dict(r._mapping) for r in rows], default=str))
    await engine.dispose()

asyncio.run(main())
