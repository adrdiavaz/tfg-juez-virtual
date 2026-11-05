import contextlib
from dataclasses import dataclass

from app.integrations.go_judge.client import GoJudgeClient
from app.integrations.go_judge.dto.request import Cmd, Collector, MemoryFile, PreparedFile
from app.integrations.go_judge.dto.result import Result, Status
from app.integrations.go_judge.exceptions import GoJudgeError
from app.integrations.go_judge.languages import LANGUAGES, Language, LanguageSpec

_NS_PER_MS = 1_000_000
_MIB = 1024 * 1024
_ENV = ["PATH=/usr/bin:/bin"]
_OUTPUT_MAX = _MIB
# javac y gcc lanzan varios procesos y usan bastante memoria
_COMPILE_CPU_NS = 10_000 * _NS_PER_MS
_COMPILE_MEMORY = 1024 * _MIB
_COMPILE_PROC_LIMIT = 64


@dataclass(frozen=True)
class Execution:
    compile: Result | None
    run: Result | None


def _output_files(stdin: str) -> list[MemoryFile | Collector]:
    return [
        MemoryFile(content=stdin),
        Collector(name="stdout", max=_OUTPUT_MAX),
        Collector(name="stderr", max=_OUTPUT_MAX),
    ]


def _compile_cmd(spec: LanguageSpec, args: list[str], source: str) -> Cmd:
    return Cmd(
        args=args,
        env=_ENV,
        files=_output_files(""),
        cpu_limit=_COMPILE_CPU_NS,
        clock_limit=2 * _COMPILE_CPU_NS,
        memory_limit=_COMPILE_MEMORY,
        proc_limit=_COMPILE_PROC_LIMIT,
        copy_in={spec.source_name: MemoryFile(content=source)},
        copy_out_cached=[spec.artifact] if spec.artifact else None,
    )


def _run_cmd(
    spec: LanguageSpec,
    copy_in: dict[str, MemoryFile | PreparedFile],
    stdin: str,
    time_limit_ms: int,
    memory_limit_mb: int,
) -> Cmd:
    cpu_limit = time_limit_ms * _NS_PER_MS
    return Cmd(
        args=spec.run_args,
        env=_ENV,
        files=_output_files(stdin),
        cpu_limit=cpu_limit,
        # Tope por reloj para cortar también los programas bloqueados sin consumir CPU
        clock_limit=2 * cpu_limit,
        memory_limit=memory_limit_mb * _MIB,
        proc_limit=spec.proc_limit,
        copy_in=copy_in,
    )


async def run_program(
    client: GoJudgeClient,
    language: Language,
    source: str,
    stdin: str,
    time_limit_ms: int,
    memory_limit_mb: int,
) -> Execution:
    """Compila (si el lenguaje lo requiere) y ejecuta `source`, devolviendo ambos resultados."""
    spec = LANGUAGES[language]
    copy_in: dict[str, MemoryFile | PreparedFile] = {spec.source_name: MemoryFile(content=source)}
    compiled: Result | None = None
    artifact_id: str | None = None
    try:
        if spec.compile_args:
            [compiled] = await client.run([_compile_cmd(spec, spec.compile_args, source)])
            if compiled.status is not Status.ACCEPTED:
                return Execution(compile=compiled, run=None)
            artifact_id = (compiled.file_ids or {}).get(spec.artifact or "")
            if artifact_id is None or spec.artifact is None:
                raise GoJudgeError("go-judge no devolvió el artefacto compilado")
            copy_in = {spec.artifact: PreparedFile(file_id=artifact_id)}
        [run] = await client.run([_run_cmd(spec, copy_in, stdin, time_limit_ms, memory_limit_mb)])
        return Execution(compile=compiled, run=run)
    finally:
        if artifact_id is not None:
            # shortcut: un archivo cacheado que no se borra queda hasta reiniciar go-judge;
            # mejor eso que ocultar el resultado o el error original
            with contextlib.suppress(GoJudgeError):
                await client.delete_file(artifact_id)
