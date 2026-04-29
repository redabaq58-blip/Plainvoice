from pydantic_settings import BaseSettings, SettingsConfigDict


LOCAL_API_PREFIXES = ("http://localhost", "http://127.0.0.1")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Runtime
    node_env: str = "development"

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
    disable_auth: bool = False
    dev_auth_bypass: bool = False
    next_public_dev_auth_bypass: bool = False
    public_api_url: str = "http://localhost:8000"
    next_public_api_url: str = "http://localhost:8000"
    next_public_site_url: str = "http://localhost:3000"
    database_url: str = ""

    def is_production(self) -> bool:
        return self.node_env == "production"

    def uses_local_api_urls(self) -> bool:
        return self.public_api_url.startswith(LOCAL_API_PREFIXES) and (
            self.next_public_api_url.startswith(LOCAL_API_PREFIXES)
        )

    def dev_auth_bypass_enabled(self) -> bool:
        """Local-only auth bypass for seeded development data.

        This intentionally ignores DISABLE_AUTH. Production safety depends on
        the bypass requiring NODE_ENV != "production", DEV_AUTH_BYPASS=true,
        and local API URLs.
        """
        return (
            not self.is_production()
            and self.dev_auth_bypass
            and self.uses_local_api_urls()
        )

    def production_configuration_errors(self) -> list[str]:
        errors: list[str] = []

        if self.is_production() and (self.dev_auth_bypass or self.next_public_dev_auth_bypass):
            errors.append(
                "DEV_AUTH_BYPASS/NEXT_PUBLIC_DEV_AUTH_BYPASS must be false in production."
            )

        if self.is_production() and self.public_api_url.startswith(LOCAL_API_PREFIXES):
            errors.append("PUBLIC_API_URL must not point to localhost in production.")

        if self.is_production() and self.next_public_api_url.startswith(LOCAL_API_PREFIXES):
            errors.append("NEXT_PUBLIC_API_URL must not point to localhost in production.")

        required = {
            "NEXT_PUBLIC_SUPABASE_URL": self.next_public_supabase_url,
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": self.next_public_supabase_anon_key,
            "SUPABASE_SERVICE_ROLE_KEY": self.supabase_service_role_key,
            "VAPI_PRIVATE_KEY": self.vapi_private_key,
            "TWILIO_ACCOUNT_SID": self.twilio_account_sid,
            "TWILIO_AUTH_TOKEN": self.twilio_auth_token,
            "TWILIO_PHONE_NUMBER": self.twilio_phone_number,
            "PUBLIC_API_URL": self.public_api_url,
            "NEXT_PUBLIC_API_URL": self.next_public_api_url,
            "NEXT_PUBLIC_SITE_URL": self.next_public_site_url,
        }
        for name, value in required.items():
            if not value:
                errors.append(f"{name} is required in production.")

        return errors

    def local_configuration_warnings(self) -> list[str]:
        warnings: list[str] = []
        required_for_core = {
            "NEXT_PUBLIC_SUPABASE_URL": self.next_public_supabase_url,
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": self.next_public_supabase_anon_key,
            "SUPABASE_SERVICE_ROLE_KEY": self.supabase_service_role_key,
        }
        for name, value in required_for_core.items():
            if not value:
                warnings.append(f"{name} is missing; database-backed API routes may fail.")

        if self.dev_auth_bypass and not self.uses_local_api_urls():
            warnings.append(
                "DEV_AUTH_BYPASS is set but ignored because PUBLIC_API_URL/NEXT_PUBLIC_API_URL are not local."
            )

        return warnings

    def cors_origins(self) -> list[str]:
        origins = ["http://localhost:3000"]
        site_url = self.next_public_site_url.rstrip("/")
        if site_url and site_url not in origins:
            origins.append(site_url)
        return origins


settings = Settings()
