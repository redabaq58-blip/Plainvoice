from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    next_public_supabase_url: str = ""
    next_public_supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Vapi
    vapi_private_key: str = ""
    vapi_webhook_secret: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # App
    next_public_api_url: str = "http://localhost:8000"
    database_url: str = ""


settings = Settings()
