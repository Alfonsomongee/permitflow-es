import asyncio
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('apps/api/.env')
engine = create_engine(os.environ['DATABASE_URL'])
with engine.connect() as conn:
    result = conn.execute(text("select column_name from information_schema.columns where table_name = 'expedientes' order by column_name;"))
    for row in result:
        print(row[0])
