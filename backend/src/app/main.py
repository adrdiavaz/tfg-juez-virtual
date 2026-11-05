from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import poc

app = FastAPI(title="Juez virtual")

# shortcut: origen del frontend fijo para la prueba de concepto; pasarlo a Settings al desplegar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(poc.router)
