import asyncio
import asyncpg
import os

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
        await conn.execute("""
            alter table organizaciones
              add column if not exists plan text not null default 'free',
              add column if not exists suscripcion_activa boolean not null default false;
        """)
        await conn.execute("NOTIFY pgrst, 'reload schema';")
        await conn.execute("""
            update organizaciones
            set plan = 'pro', suscripcion_activa = true
            where clerk_org_id = 'org_3FrtMOL7YbL7lzedRO49hifcoWT';
        """)
        
        print("SQL updates executed successfully.")
        
        rows = await conn.fetch("select column_name from information_schema.columns where table_name='organizaciones';")
        cols = [r['column_name'] for r in rows]
        print("Columnas actuales en organizaciones:", cols)
        
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
