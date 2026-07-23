import os
from sqlalchemy import create_engine, text

env_path = os.path.join('apps', 'api', '.env')
db_url = ""
with open(env_path) as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1].strip('"\'')
            break

engine = create_engine(db_url)
with engine.connect() as conn:
    print('--- ORGANIZACIONES ---')
    res = conn.execute(text('select id, clerk_org_id, nombre, plan, suscripcion_activa from organizaciones;'))
    for row in res:
        print(dict(row._mapping))
        
    print('--- EXPEDIENTES ---')
    res = conn.execute(text('select id, org_id, clerk_user_id from expedientes limit 5;'))
    for row in res:
        print(dict(row._mapping))
