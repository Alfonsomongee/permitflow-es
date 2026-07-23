import asyncio
from database import engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def main():
    async with engine.begin() as conn:
        result = await conn.execute(text("select column_name from information_schema.columns where table_name = 'expedientes' order by column_name;"))
        for row in result:
            print(row[0])

asyncio.run(main())
