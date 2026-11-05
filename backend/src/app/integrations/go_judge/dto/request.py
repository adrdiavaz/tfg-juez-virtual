from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _Dto(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class MemoryFile(_Dto):
    content: str


class PreparedFile(_Dto):
    file_id: str


class Collector(_Dto):
    name: str
    max: int


class Cmd(_Dto):
    """Un comando a ejecutar. Tiempos en nanosegundos y memoria en bytes."""

    args: list[str]
    env: list[str] | None = None
    files: list[MemoryFile | Collector] | None = None
    cpu_limit: int | None = None
    clock_limit: int | None = None
    memory_limit: int | None = None
    stack_limit: int | None = None
    proc_limit: int | None = None
    copy_in: dict[str, MemoryFile | PreparedFile] | None = None
    copy_out: list[str] | None = None
    copy_out_cached: list[str] | None = None
