from fastapi import FastAPI, middleware
from backend.api.agent import router as agent_router

import uvicorn
import logging

logging.basicConfig(level=logging.DEBUG)

ALLOWED_ORIGINS = (
    "http://localhost:8000"
)

app = FastAPI()

app.add_middleware(
    middleware.cors.CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=[],
)
app.include_router(agent_router, prefix="/api/agent")

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        use_colors=True,
        proxy_headers=True,
    )