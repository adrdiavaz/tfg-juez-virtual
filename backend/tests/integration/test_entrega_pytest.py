"""Simulación de entregas: el profesor sube una suite de pytest y varios alumnos entregan su
solución. Pasa por el endpoint y un go-judge real (docker compose up -d)."""

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

pytestmark = pytest.mark.usefixtures("go_judge_disponible")

TESTS_PROFESOR = {
    "test_solucion.py": """\
from solucion import es_primo, fibonacci


def test_primos():
    assert [n for n in range(20) if es_primo(n)] == [2, 3, 5, 7, 11, 13, 17, 19]


def test_fibonacci():
    assert [fibonacci(n) for n in range(8)] == [0, 1, 1, 2, 3, 5, 8, 13]


def test_fibonacci_grande():
    assert fibonacci(90) == 2880067194370816120
""",
}

CORRECTA = """\
def es_primo(n):
    return n > 1 and all(n % d for d in range(2, int(n**0.5) + 1))


def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
"""


async def _entregar(codigo: str, **limites: int) -> dict[str, Any]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/poc/pruebas", json={"codigo": codigo, "tests": TESTS_PROFESOR, **limites}
        )
    assert response.status_code == 200, response.text
    return response.json()


def _resultados(respuesta: dict[str, Any]) -> dict[str, str]:
    return {p["nombre"]: p["resultado"] for p in respuesta["pruebas"]}


async def test_entrega_correcta_es_aceptada() -> None:
    respuesta = await _entregar(CORRECTA)

    assert respuesta["veredicto"] == "aceptado"
    assert _resultados(respuesta) == {
        "test_primos": "passed",
        "test_fibonacci": "passed",
        "test_fibonacci_grande": "passed",
    }


async def test_entrega_con_un_fallo_es_respuesta_incorrecta() -> None:
    codigo = CORRECTA.replace("n > 1 and ", "")  # 0 y 1 pasan a ser primos

    respuesta = await _entregar(codigo)

    assert respuesta["veredicto"] == "respuesta_incorrecta"
    assert _resultados(respuesta)["test_primos"] == "failed"
    assert _resultados(respuesta)["test_fibonacci"] == "passed"


async def test_una_excepcion_es_error_de_ejecucion() -> None:
    codigo = CORRECTA + "\ndef es_primo(n):\n    raise RuntimeError('sin terminar')\n"

    respuesta = await _entregar(codigo)

    assert respuesta["veredicto"] == "error_ejecucion"
    assert _resultados(respuesta)["test_primos"] == "errored"


async def test_un_error_de_sintaxis_es_error_de_compilacion() -> None:
    respuesta = await _entregar("def es_primo(n)\n    return True\n")

    assert respuesta["veredicto"] == "error_compilacion"


async def test_una_solucion_lenta_supera_el_tiempo_y_no_tiene_informe() -> None:
    codigo = (
        CORRECTA
        + "\ndef fibonacci(n):\n    return n if n < 2 else fibonacci(n-1) + fibonacci(n-2)\n"
    )

    respuesta = await _entregar(codigo, limite_tiempo_ms=500)

    assert respuesta["veredicto"] == "tiempo_excedido"
    assert respuesta["pruebas"] is None


async def test_reservar_demasiada_memoria_es_memoria_excedida() -> None:
    codigo = CORRECTA.replace("    return a\n", "    x = [0] * (200 * 1024 * 1024)\n    return a\n")

    respuesta = await _entregar(codigo, limite_memoria_mb=64)

    assert respuesta["veredicto"] == "memoria_excedida"
    assert respuesta["pruebas"] is None


async def test_salir_antes_de_los_tests_no_es_aceptado() -> None:
    respuesta = await _entregar("import os\nos._exit(0)\n")

    assert respuesta["veredicto"] == "fallo_tecnico"


async def test_un_informe_falsificado_no_es_aceptado() -> None:
    falso = (
        '<testsuites><testsuite tests="1">'
        '<testcase name="test_primos" time="0"/></testsuite></testsuites>'
    )
    codigo = (
        CORRECTA.replace("n > 1 and ", "")
        + f"\nimport atexit\natexit.register(lambda: open('report.xml', 'w').write({falso!r}))\n"
    )

    respuesta = await _entregar(codigo)

    assert respuesta["veredicto"] == "fallo_tecnico"
    assert _resultados(respuesta) == {"test_primos": "passed"}
