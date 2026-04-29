from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.phone_numbers import router as phone_numbers_router
from app.routers.vapi_webhooks import router as vapi_webhooks_router
from app.routers.voice_agents import router as voice_agents_router

app = FastAPI(title="PlainVoice API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_agents_router, prefix="/api")
app.include_router(phone_numbers_router, prefix="/api")
app.include_router(vapi_webhooks_router, prefix="/api")


@app.on_event("startup")
async def validate_runtime_configuration() -> None:
    """Fail fast for unsafe production env and warn for incomplete local setup."""
    errors = settings.production_configuration_errors()
    if errors:
        raise RuntimeError("Invalid PlainVoice production configuration: " + " ".join(errors))

    for warning in settings.local_configuration_warnings():
        print(f"PlainVoice config warning: {warning}")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "plainvoice-api"}
