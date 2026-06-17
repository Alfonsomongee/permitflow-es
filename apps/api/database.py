from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings

# Modify the URL to use the asyncpg driver if a database URL is provided
db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if db_url:
    engine = create_async_engine(db_url, echo=(settings.ENVIRONMENT == "development"))
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
else:
    engine = None
    AsyncSessionLocal = None

Base = declarative_base()

async def get_db():
    if AsyncSessionLocal is None:
        raise RuntimeError("La base de datos no está configurada. Comprueba DATABASE_URL en .env")
    async with AsyncSessionLocal() as session:
        yield session
