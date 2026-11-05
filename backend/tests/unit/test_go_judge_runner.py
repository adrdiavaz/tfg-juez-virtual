import json
from typing import Any

import httpx
import pytest

from app.integrations.go_judge.client import GoJudgeClient
from app.integrations.go_judge.dto.result import Status
from app.integrations.go_judge.exceptions import GoJudgeError
from app.integrations.go_judge.languages import Language
from app.integrations.go_judge.runner import run_program


def _ok(file_ids: dict[str, str] | None = None) -> dict[str, object]:
    return {"status": "Accepted", "exitStatus": 0, "fileIds": file_ids}


class _Servidor:
    """go-judge simulado: responde a cada POST /run por orden y registra las peticiones."""

    def __init__(self, respuestas: list[httpx.Response]) -> None:
        self.respuestas = respuestas
        self.peticiones: list[tuple[str, str, dict[str, Any]]] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        cuerpo: dict[str, Any] = json.loads(request.content) if request.content else {}
        self.peticiones.append((request.method, request.url.path, cuerpo))
        if request.method == "DELETE":
            return httpx.Response(200)
        return self.respuestas.pop(0)

    @property
    def rutas(self) -> list[str]:
        return [f"{metodo} {ruta}" for metodo, ruta, _ in self.peticiones]

    def cmd(self, indice: int) -> dict[str, Any]:
        runs = [cuerpo for metodo, _, cuerpo in self.peticiones if metodo == "POST"]
        return runs[indice]["cmd"][0]


def _client(servidor: _Servidor) -> GoJudgeClient:
    http = httpx.AsyncClient(transport=httpx.MockTransport(servidor), base_url="http://test")
    return GoJudgeClient(http)


async def test_error_de_compilacion_no_ejecuta_el_programa() -> None:
    servidor = _Servidor(
        [httpx.Response(200, json=[{"status": "Nonzero Exit Status", "exitStatus": 1}])]
    )

    resultado = await run_program(_client(servidor), Language.CPP, "x", "", 1000, 64)

    assert resultado.compile is not None
    assert resultado.compile.status is Status.NONZERO_EXIT_STATUS
    assert resultado.run is None
    assert servidor.rutas == ["POST /run"]


async def test_compilacion_correcta_pasa_el_artefacto_a_la_ejecucion_y_lo_borra() -> None:
    servidor = _Servidor(
        [
            httpx.Response(200, json=[_ok({"main": "ID1"})]),
            httpx.Response(200, json=[_ok()]),
        ]
    )

    resultado = await run_program(_client(servidor), Language.C, "int main(){}", "5", 1000, 64)

    assert resultado.run is not None and resultado.run.status is Status.ACCEPTED
    assert servidor.cmd(1)["copyIn"] == {"main": {"fileId": "ID1"}}
    assert servidor.rutas == ["POST /run", "POST /run", "DELETE /file/ID1"]


async def test_borra_el_artefacto_aunque_falle_la_ejecucion() -> None:
    servidor = _Servidor([httpx.Response(200, json=[_ok({"main": "ID1"})]), httpx.Response(500)])

    with pytest.raises(GoJudgeError):
        await run_program(_client(servidor), Language.C, "x", "", 1000, 64)

    assert servidor.rutas[-1] == "DELETE /file/ID1"


async def test_python_se_ejecuta_sin_compilar() -> None:
    servidor = _Servidor([httpx.Response(200, json=[_ok()])])

    resultado = await run_program(_client(servidor), Language.PYTHON, "print(1)", "", 1000, 64)

    assert resultado.compile is None
    assert servidor.rutas == ["POST /run"]
    assert servidor.cmd(0)["copyIn"] == {"main.py": {"content": "print(1)"}}


async def test_java_cachea_el_class_con_su_nombre() -> None:
    servidor = _Servidor(
        [
            httpx.Response(200, json=[_ok({"Main.class": "ID2"})]),
            httpx.Response(200, json=[_ok()]),
        ]
    )

    await run_program(_client(servidor), Language.JAVA, "class Main{}", "", 1000, 64)

    assert servidor.cmd(0)["copyOutCached"] == ["Main.class"]
    assert servidor.cmd(1)["copyIn"] == {"Main.class": {"fileId": "ID2"}}


async def test_convierte_milisegundos_y_mebibytes_a_nanosegundos_y_bytes() -> None:
    servidor = _Servidor([httpx.Response(200, json=[_ok()])])

    await run_program(_client(servidor), Language.PYTHON, "", "entrada", 1500, 64)

    cmd = servidor.cmd(0)
    assert cmd["cpuLimit"] == 1_500_000_000
    assert cmd["clockLimit"] == 3_000_000_000
    assert cmd["memoryLimit"] == 64 * 1024 * 1024
    assert cmd["files"][0] == {"content": "entrada"}


async def test_compilacion_sin_artefacto_lanza_go_judge_error() -> None:
    servidor = _Servidor([httpx.Response(200, json=[_ok()])])

    with pytest.raises(GoJudgeError):
        await run_program(_client(servidor), Language.C, "x", "", 1000, 64)
