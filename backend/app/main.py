from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Tonify Backend",
    version="0.1.0",
    description="Audio reference → Fender Mustang LT25 preset prediction.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "tonify-backend", "docs": "/docs"}


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "tonify-backend"}
