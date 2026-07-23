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
        print('--- ORGANIZACIONES ---')
        rows = await conn.fetch('select * from organizaciones;')
        for row in rows:
            print(dict(row))
            
        print('--- EXPEDIENTES ---')
        rows = await conn.fetch('select id, org_id, clerk_user_id from expedientes limit 5;')
        for row in rows:
            print(dict(row))
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
