from collections.abc import Mapping

import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.core.config import settings
from app.integrations.go_judge.dto.result import Result, Status
from app.integrations.go_judge.languages import Language
from app.integrations.go_judge.runner import Execution
from app.main import app

PETICION = {"lenguaje": "python", "codigo": "print(1)"}


async def _post(cuerpo: Mapping[str, object]) -> Response:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.post("/poc/ejecuciones", json=cuerpo)


@pytest.mark.parametrize(
    "limites",
    [{"limite_tiempo_ms": 10}, {"limite_tiempo_ms": 60_000}, {"limite_memoria_mb": 4}],
)
async def test_rechaza_limites_fuera_de_rango(limites: dict[str, int]) -> None:
    response = await _post({**PETICION, **limites})

    assert response.status_code == 422


async def test_rechaza_un_lenguaje_desconocido() -> None:
    response = await _post({**PETICION, "lenguaje": "brainfuck"})

    assert response.status_code == 422


async def test_sin_go_judge_responde_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "go_judge_url", "http://127.0.0.1:1")

    response = await _post(PETICION)

    assert response.status_code == 503


async def test_convierte_unidades_y_salidas(monkeypatch: pytest.MonkeyPatch) -> None:
    async def falso(*args: object) -> Execution:
        assert args[1] is Language.PYTHON
        run = Result(
            status=Status.ACCEPTED,
            exit_status=0,
            time=5_000_000,
            memory=2048,
            files={"stdout": "1\n", "stderr": ""},
        )
        return Execution(compile=None, run=run)

    monkeypatch.setattr("app.api.poc.run_program", falso)

    response = await _post(PETICION)

    assert response.status_code == 200
    assert response.json() == {
        "compilacion": None,
        "ejecucion": {
            "estado": "Accepted",
            "codigo_salida": 0,
            "tiempo_ms": 5,
            "memoria_kb": 2,
            "stdout": "1\n",
            "stderr": "",
        },
    }
