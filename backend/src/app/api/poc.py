"""Endpoint provisional de la prueba de concepto. Ejecuta código arbitrario sin autenticar."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.integrations.go_judge.client import GoJudgeClient, create_http_client
from app.integrations.go_judge.dto.result import Result, Status
from app.integrations.go_judge.exceptions import GoJudgeError
from app.integrations.go_judge.languages import Language
from app.integrations.go_judge.runner import run_program

router = APIRouter(prefix="/poc", tags=["poc"])


class EjecucionPeticion(BaseModel):
    lenguaje: Language
    codigo: str = Field(max_length=65536)
    entrada: str = Field(default="", max_length=65536)
    limite_tiempo_ms: int = Field(default=1000, ge=100, le=10_000)
    limite_memoria_mb: int = Field(default=256, ge=16, le=1024)


class ResultadoComando(BaseModel):
    estado: Status
    codigo_salida: int
    tiempo_ms: int
    memoria_kb: int
    stdout: str
    stderr: str


class EjecucionRespuesta(BaseModel):
    compilacion: ResultadoComando | None
    ejecucion: ResultadoComando | None


def _resultado(r: Result | None) -> ResultadoComando | None:
    if r is None:
        return None
    files = r.files or {}
    return ResultadoComando(
        estado=r.status,
        codigo_salida=r.exit_status,
        tiempo_ms=r.time // 1_000_000,
        memoria_kb=r.memory // 1024,
        stdout=files.get("stdout", ""),
        stderr=files.get("stderr", "") or r.error or "",
    )


@router.post("/ejecuciones")
async def ejecutar(peticion: EjecucionPeticion) -> EjecucionRespuesta:
    async with create_http_client(settings) as http:
        try:
            resultado = await run_program(
                GoJudgeClient(http),
                peticion.lenguaje,
                peticion.codigo,
                peticion.entrada,
                peticion.limite_tiempo_ms,
                peticion.limite_memoria_mb,
            )
        except GoJudgeError as e:
            raise HTTPException(503, "Servicio de ejecución no disponible") from e
    return EjecucionRespuesta(
        compilacion=_resultado(resultado.compile), ejecucion=_resultado(resultado.run)
    )
