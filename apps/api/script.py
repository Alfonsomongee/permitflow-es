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
        # Get a real expediente
        row = await conn.fetchrow("""
            SELECT id FROM public.expedientes 
            LIMIT 1;
        """)
        if row:
            print(f"Found expediente: {row['id']}")
        else:
            print("No expedientes found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
