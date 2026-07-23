import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

sql_commands = [
    "ALTER TABLE expedientes ALTER COLUMN creado_en SET DEFAULT now();",
    "ALTER TABLE expedientes ALTER COLUMN actualizado_en SET DEFAULT now();",
    "ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;",
    """
    CREATE TABLE IF NOT EXISTS historial_tramites (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      expediente_id uuid NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
      orden integer NOT NULL,
      estado_anterior text,
      estado_nuevo text NOT NULL,
      operador_id text NOT NULL,
      creado_en timestamptz NOT NULL DEFAULT now()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_historial_tramites_expediente ON historial_tramites (expediente_id, creado_en DESC);"
]

print("Applying migrations...")
for cmd in sql_commands:
    try:
        cur.execute(cmd)
        print(f"Success: {cmd.strip().splitlines()[0]}")
    except Exception as e:
        print(f"Error executing: {cmd.strip().splitlines()[0]}\nError: {e}")

cur.close()
conn.close()
print("Done.")
