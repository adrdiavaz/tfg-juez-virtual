from enum import StrEnum

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Status(StrEnum):
    ACCEPTED = "Accepted"
    MEMORY_LIMIT_EXCEEDED = "Memory Limit Exceeded"
    TIME_LIMIT_EXCEEDED = "Time Limit Exceeded"
    OUTPUT_LIMIT_EXCEEDED = "Output Limit Exceeded"
    FILE_ERROR = "File Error"
    NONZERO_EXIT_STATUS = "Nonzero Exit Status"
    SIGNALLED = "Signalled"
    DANGEROUS_SYSCALL = "Dangerous Syscall"
    INTERNAL_ERROR = "Internal Error"


class Result(BaseModel):
    """Resultado de un comando. `time` y `run_time` en nanosegundos, `memory` en bytes."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: Status
    exit_status: int
    error: str | None = None
    time: int = 0
    memory: int = 0
    run_time: int = 0
    files: dict[str, str] | None = None
    file_ids: dict[str, str] | None = None
