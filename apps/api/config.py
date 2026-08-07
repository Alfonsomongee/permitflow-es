from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Fail-safe: sin ENVIRONMENT definido en el entorno, se asume "production" para que
    # el gate INTERNAL_API_KEY (seguridad.py) exija la clave en vez de abrirse en silencio.
    # En local, define ENVIRONMENT=development explícitamente en tu .env.
    ENVIRONMENT: str = "production"
    DATABASE_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None

    # Seguridad interna: clave compartida con Next.js (cabecera X-Internal-Key)
    INTERNAL_API_KEY: Optional[str] = None
    # Clave secreta para HMAC de tokens de estudio y hash del CUPS.
    # SIN valor por defecto: la app falla al arrancar si no está en el entorno.
    # Generar: python -c "import secrets; print(secrets.token_hex(32))"
    # Añadir a Railway/Vercel como variable de entorno SECRET_KEY.
    SECRET_KEY: str
    
    # API Keys
    DEEPSEEK_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    
    # Auth & Payments
    CLERK_SECRET_KEY: Optional[str] = None
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Integrations
    RESEND_API_KEY: Optional[str] = None
    # Antes no declaradas: pydantic-settings solo expone en settings.* las
    # variables que están en la clase, así que aunque estuvieran en .env,
    # getattr(settings, "NOTIFICATION_EMAIL", ...) siempre devolvía el
    # default y dependían de que también existieran como variables de
    # entorno reales del proceso (cierto en GitHub Actions, falso en local
    # con solo un .env). Declaradas aquí, funcionan en ambos casos.
    NOTIFICATION_EMAIL: Optional[str] = None
    RESEND_FROM_DOMAIN: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SENTRY_DSN: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
