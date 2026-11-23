from dataclasses import dataclass
from enum import StrEnum

# Sin defusedxml: expat >= 2.4.1 (el de Python 3.13) ya corta la expansión de entidades y
# ElementTree no resuelve entidades externas; el tamaño lo limita copyOutMax
from xml.etree import ElementTree as ET

# pytest marca como <failure> tanto las aserciones como las excepciones; el tipo de la
# excepción es lo último de la traza ("test_x.py:5: AssertionError")
_ASSERTION_TYPES = ("AssertionError", "Failed")


class Outcome(StrEnum):
    PASSED = "passed"
    FAILED = "failed"
    ERRORED = "errored"
    SKIPPED = "skipped"


@dataclass(frozen=True)
class CaseResult:
    name: str
    outcome: Outcome
    time_ms: int
    message: str


def _outcome(case: ET.Element) -> tuple[Outcome, str]:
    if (el := case.find("failure")) is not None:
        lines = (el.text or "").strip().splitlines() or [""]
        is_assertion = lines[-1].rsplit(": ", 1)[-1] in _ASSERTION_TYPES
        return (Outcome.FAILED if is_assertion else Outcome.ERRORED), el.get("message", "")
    if (el := case.find("error")) is not None:
        return Outcome.ERRORED, el.get("message", "")
    if (el := case.find("skipped")) is not None:
        return Outcome.SKIPPED, el.get("message", "")
    return Outcome.PASSED, ""


def parse_junit(xml: str) -> list[CaseResult]:
    """Resultados por test en el orden del informe.

    El informe lo escribe un proceso que ejecuta código del alumno: lanza `ET.ParseError` o
    `ValueError` si está mal formado.
    """
    results: list[CaseResult] = []
    for case in ET.fromstring(xml).iter("testcase"):
        outcome, message = _outcome(case)
        results.append(
            CaseResult(
                name=case.get("name", ""),
                outcome=outcome,
                time_ms=round(float(case.get("time", "0")) * 1000),
                message=message,
            )
        )
    return results
