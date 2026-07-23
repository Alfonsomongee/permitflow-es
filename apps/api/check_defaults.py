import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

query = """
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expedientes'
ORDER BY column_name;
"""

cur.execute(query)
rows = cur.fetchall()

print("All columns in 'expedientes':")
for r in rows:
    print(f"- {r[0]} | Nullable: {r[1]} | Default: {r[2]}")

cur.close()
conn.close()
