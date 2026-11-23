"""Pruebas contra un go-judge real (docker compose up -d). Se omiten si no responde."""

from collections.abc import AsyncIterator

import pytest

from app.core.config import settings
from app.integrations.go_judge.client import GoJudgeClient, create_http_client
from app.integrations.go_judge.dto.result import Status
from app.integrations.go_judge.languages import Language
from app.integrations.go_judge.runner import run_program

DOBLE = {
    Language.C: '#include <stdio.h>\nint main(){int n;scanf("%d",&n);printf("%d\\n",n*2);}',
    Language.CPP: "#include <iostream>\nint main(){int n;std::cin>>n;std::cout<<n*2<<'\\n';}",
    Language.PYTHON: "print(int(input()) * 2)",
    Language.JAVA: (
        "import java.util.Scanner;\n"
        "public class Main { public static void main(String[] a) {"
        " System.out.println(new Scanner(System.in).nextInt() * 2); } }"
    ),
}


pytestmark = pytest.mark.usefixtures("go_judge_disponible")


@pytest.fixture
async def client() -> AsyncIterator[GoJudgeClient]:
    async with create_http_client(settings) as http:
        yield GoJudgeClient(http)


def _stdout(files: dict[str, str] | None) -> str:
    return (files or {}).get("stdout", "")


@pytest.mark.parametrize("language", list(Language))
async def test_compila_y_ejecuta_leyendo_la_entrada(
    client: GoJudgeClient, language: Language
) -> None:
    resultado = await run_program(client, language, DOBLE[language], "21", 2000, 256)

    assert resultado.run is not None
    assert resultado.run.status is Status.ACCEPTED, resultado.run.error
    assert _stdout(resultado.run.files).strip() == "42"


async def test_un_error_de_compilacion_no_llega_a_ejecutarse(client: GoJudgeClient) -> None:
    resultado = await run_program(client, Language.CPP, "int main(){ x }", "", 2000, 256)

    assert resultado.compile is not None
    assert resultado.compile.status is Status.NONZERO_EXIT_STATUS
    assert resultado.run is None


async def test_detiene_un_bucle_infinito_por_tiempo(client: GoJudgeClient) -> None:
    resultado = await run_program(client, Language.PYTHON, "while True: pass", "", 500, 256)

    assert resultado.run is not None
    assert resultado.run.status is Status.TIME_LIMIT_EXCEEDED


async def test_detiene_un_programa_que_supera_la_memoria(client: GoJudgeClient) -> None:
    codigo = "x = [0] * (200 * 1024 * 1024)"
    resultado = await run_program(client, Language.PYTHON, codigo, "", 5000, 64)

    assert resultado.run is not None
    assert resultado.run.status is Status.MEMORY_LIMIT_EXCEEDED


async def test_no_hay_red(client: GoJudgeClient) -> None:
    codigo = """
import socket
try:
    socket.create_connection(("1.1.1.1", 80), timeout=3).close()
    print("accedido")
except OSError:
    print("bloqueado")
"""
    resultado = await run_program(client, Language.PYTHON, codigo, "", 5000, 256)

    assert resultado.run is not None
    assert _stdout(resultado.run.files).strip() == "bloqueado"


@pytest.mark.parametrize(
    ("ruta", "modo"),
    [("/etc/shadow", "r"), ("/opt/mount.yaml", "r"), ("/usr/escrito.txt", "w")],
)
async def test_no_accede_a_archivos_del_servidor(
    client: GoJudgeClient, ruta: str, modo: str
) -> None:
    codigo = f"""
try:
    open({ruta!r}, {modo!r}).close()
    print("accedido")
except OSError:
    print("bloqueado")
"""
    resultado = await run_program(client, Language.PYTHON, codigo, "", 2000, 256)

    assert resultado.run is not None
    assert _stdout(resultado.run.files).strip() == "bloqueado"
