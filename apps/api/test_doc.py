import asyncio
import asyncpg
import os
from pprint import pprint

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
        # Get a real expediente with a plan_tramitacion
        row = await conn.fetchrow("""
            SELECT * FROM public.expedientes 
            WHERE plan_tramitacion IS NOT NULL
            LIMIT 1;
        """)
        if row:
            print(f"Found expediente: {row['id']}")
            
            # test generar_documento function locally
            import sys
            sys.path.append(os.getcwd())
            
            from documentos.generador import generar_documento
            from documentos.schemas import GenerarDocumentoInput
            
            import json
            plan = row['plan_tramitacion']
            if isinstance(plan, str):
                plan = json.loads(plan)
                
            tramites = row.get('tramites_estado', {})
            if isinstance(tramites, str):
                tramites = json.loads(tramites)
                
            payload = {
                "tipo": "plan",
                "organizacion": {"nombre": "Org Test", "plan": "pro"},
                "expediente": dict(row),
                "plan": plan,
                "tramites_estado": tramites
            }
            
            print("Payload ready, calling generar_documento...")
            try:
                # We need to parse to Pydantic model first
                from pydantic import BaseModel
                input_data = GenerarDocumentoInput(**payload)
                
                contenido, media_type, filename = generar_documento(input_data)
                print(f"Successfully generated document: {filename} ({len(contenido)} bytes)")
            except Exception as e:
                print(f"Error generating document: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("No expedientes with plan_tramitacion found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
