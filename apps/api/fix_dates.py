import asyncio
import asyncpg
import os
from datetime import datetime

async def main():
    env_path = '.env'
    db_url = ""
    with open(env_path) as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                db_url = line.strip().split('=', 1)[1].strip('"\'')
                break

    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgres://', 1)
        
    conn = await asyncpg.connect(db_url)
    try:
        await conn.execute("UPDATE expedientes SET creado_en = NOW() WHERE creado_en IS NULL;")
        await conn.execute("UPDATE expedientes SET actualizado_en = NOW() WHERE actualizado_en IS NULL;")
        await conn.execute("UPDATE organizaciones SET creado_en = NOW() WHERE creado_en IS NULL;")
        print("Updated NULL dates in DB.")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
