from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.phone_numbers import router as phone_numbers_router
from app.routers.vapi_webhooks import router as vapi_webhooks_router
from app.routers.voice_agents import router as voice_agents_router

app = FastAPI(title="PlainVoice API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_agents_router, prefix="/api")
app.include_router(phone_numbers_router, prefix="/api")
app.include_router(vapi_webhooks_router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "plainvoice-api"}
