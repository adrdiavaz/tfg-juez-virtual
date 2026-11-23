"""Endpoint provisional de la prueba de concepto. Ejecuta código arbitrario sin autenticar."""

from enum import StrEnum
from typing import Annotated
from xml.etree.ElementTree import ParseError

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.integrations.go_judge.client import GoJudgeClient, create_http_client
from app.integrations.go_judge.dto.result import Result, Status
from app.integrations.go_judge.exceptions import GoJudgeError
from app.integrations.go_judge.frameworks import Framework
from app.integrations.go_judge.languages import Language
from app.integrations.go_judge.report import CaseResult, Outcome, parse_junit
from app.integrations.go_judge.runner import run_program, run_tests

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


class PruebasPeticion(BaseModel):
    framework: Framework = Framework.PYTEST
    codigo: str = Field(max_length=65536)
    # Nombre de fichero -> contenido. Nombres simples: van tal cual al directorio del sandbox
    tests: dict[
        Annotated[str, Field(pattern=r"^[A-Za-z_][A-Za-z0-9_]*\.py$")],
        Annotated[str, Field(max_length=65536)],
    ] = Field(min_length=1, max_length=20)
    limite_tiempo_ms: int = Field(default=2000, ge=100, le=10_000)
    limite_memoria_mb: int = Field(default=256, ge=16, le=1024)


class Veredicto(StrEnum):
    ACEPTADO = "aceptado"
    RESPUESTA_INCORRECTA = "respuesta_incorrecta"
    ERROR_EJECUCION = "error_ejecucion"
    ERROR_COMPILACION = "error_compilacion"
    TIEMPO_EXCEDIDO = "tiempo_excedido"
    MEMORIA_EXCEDIDA = "memoria_excedida"
    FALLO_TECNICO = "fallo_tecnico"


class ResultadoPrueba(BaseModel):
    nombre: str
    resultado: Outcome
    tiempo_ms: int
    mensaje: str


class PruebasRespuesta(BaseModel):
    veredicto: Veredicto
    ejecucion: ResultadoComando
    # None si no hay informe válido (límite superado o informe corrupto)
    pruebas: list[ResultadoPrueba] | None


def _veredicto(run: Result, casos: list[CaseResult] | None) -> Veredicto:
    # shortcut: el mapeo a veredictos vive aquí hasta que exista el dominio de entregas
    if run.status is Status.TIME_LIMIT_EXCEEDED:
        return Veredicto.TIEMPO_EXCEDIDO
    if run.status is Status.MEMORY_LIMIT_EXCEEDED:
        return Veredicto.MEMORIA_EXCEDIDA
    if not casos:
        return Veredicto.FALLO_TECNICO
    # El veredicto es el del primer test que no pasa (REGN-007)
    for caso in casos:
        if caso.outcome is Outcome.FAILED:
            return Veredicto.RESPUESTA_INCORRECTA
        if caso.outcome is Outcome.ERRORED:
            # pytest no puede importar los tests, normalmente por un SyntaxError del alumno
            if caso.message == "collection failure":
                return Veredicto.ERROR_COMPILACION
            return Veredicto.ERROR_EJECUCION
    # Un informe sin fallos con salida distinta de 0 no es fiable (informe falsificado o cortado)
    return Veredicto.ACEPTADO if run.status is Status.ACCEPTED else Veredicto.FALLO_TECNICO


@router.post("/pruebas")
async def ejecutar_pruebas(peticion: PruebasPeticion) -> PruebasRespuesta:
    async with create_http_client(settings) as http:
        try:
            resultado = await run_tests(
                GoJudgeClient(http),
                peticion.framework,
                peticion.codigo,
                peticion.tests,
                peticion.limite_tiempo_ms,
                peticion.limite_memoria_mb,
            )
        except ValueError as e:
            raise HTTPException(422, str(e)) from e
        except GoJudgeError as e:
            raise HTTPException(503, "Servicio de ejecución no disponible") from e
    casos: list[CaseResult] | None = None
    if resultado.report is not None:
        try:
            casos = parse_junit(resultado.report)
        except (ParseError, ValueError):
            casos = None
    ejecucion = _resultado(resultado.run)
    assert ejecucion is not None
    return PruebasRespuesta(
        veredicto=_veredicto(resultado.run, casos),
        ejecucion=ejecucion,
        pruebas=None
        if casos is None
        else [
            ResultadoPrueba(
                nombre=c.name, resultado=c.outcome, tiempo_ms=c.time_ms, mensaje=c.message
            )
            for c in casos
        ],
    )
