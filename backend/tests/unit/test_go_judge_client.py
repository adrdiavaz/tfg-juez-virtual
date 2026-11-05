import json

import httpx
import pytest

from app.core.config import Settings
from app.integrations.go_judge.client import GoJudgeClient, create_http_client
from app.integrations.go_judge.dto.request import Cmd, MemoryFile
from app.integrations.go_judge.dto.result import Status
from app.integrations.go_judge.exceptions import GoJudgeError


def _client(handler: httpx.MockTransport) -> GoJudgeClient:
    return GoJudgeClient(httpx.AsyncClient(transport=handler, base_url="http://test"))


async def test_run_serializa_en_camel_case_y_parsea_el_resultado() -> None:
    enviado: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        enviado.update(json.loads(request.content))
        return httpx.Response(
            200,
            json=[
                {
                    "status": "Accepted",
                    "exitStatus": 0,
                    "time": 5,
                    "memory": 1024,
                    "runTime": 7,
                    "fileIds": {"a": "ID1"},
                }
            ],
        )

    cmd = Cmd(
        args=["/usr/bin/g++", "a.cc"],
        cpu_limit=1,
        copy_in={"a.cc": MemoryFile(content="int main(){}")},
        copy_out_cached=["a"],
    )
    [result] = await _client(httpx.MockTransport(handler)).run([cmd])

    assert enviado == {
        "cmd": [
            {
                "args": ["/usr/bin/g++", "a.cc"],
                "cpuLimit": 1,
                "copyIn": {"a.cc": {"content": "int main(){}"}},
                "copyOutCached": ["a"],
            }
        ]
    }
    assert result.status is Status.ACCEPTED
    assert result.run_time == 7
    assert result.file_ids == {"a": "ID1"}


async def test_run_con_http_500_lanza_go_judge_error() -> None:
    client = _client(httpx.MockTransport(lambda _: httpx.Response(500)))

    with pytest.raises(GoJudgeError):
        await client.run([Cmd(args=["x"])])


async def test_run_sin_conexion_lanza_go_judge_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin red", request=request)

    with pytest.raises(GoJudgeError):
        await _client(httpx.MockTransport(handler)).run([Cmd(args=["x"])])


async def test_run_con_respuesta_invalida_lanza_go_judge_error() -> None:
    client = _client(httpx.MockTransport(lambda _: httpx.Response(200, json={"no": "lista"})))

    with pytest.raises(GoJudgeError):
        await client.run([Cmd(args=["x"])])


async def test_delete_file_usa_el_id_y_propaga_errores() -> None:
    rutas: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        rutas.append(f"{request.method} {request.url.path}")
        return httpx.Response(404)

    with pytest.raises(GoJudgeError):
        await _client(httpx.MockTransport(handler)).delete_file("ID1")

    assert rutas == ["DELETE /file/ID1"]


def test_create_http_client_anade_bearer_solo_con_token() -> None:
    con = create_http_client(Settings(go_judge_auth_token="secreto"))
    sin = create_http_client(Settings(go_judge_auth_token=""))

    assert con.headers["Authorization"] == "Bearer secreto"
    assert "Authorization" not in sin.headers
