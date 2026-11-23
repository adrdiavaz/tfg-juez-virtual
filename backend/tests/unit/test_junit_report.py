from xml.etree.ElementTree import ParseError

import pytest

from app.integrations.go_judge.report import CaseResult, Outcome, parse_junit

# Recortado de un informe real de pytest 8 en go-judge
INFORME = """<?xml version="1.0" encoding="utf-8"?><testsuites><testsuite name="pytest">
<testcase classname="test_solucion" name="test_suma" time="0.002" />
<testcase classname="test_solucion" name="test_resta" time="0.000">
<failure message="assert 2 == 3">def test_resta():
&gt;       assert suma(1, 1) == 3
E       assert 2 == 3

test_solucion.py:5: AssertionError</failure></testcase>
<testcase classname="test_solucion" name="test_div" time="0.000">
<failure message="ZeroDivisionError: division by zero">&gt;   def div(a,b): return a/b
E   ZeroDivisionError: division by zero

solucion.py:2: ZeroDivisionError</failure></testcase>
<testcase classname="test_solucion" name="test_raises" time="0.000">
<failure message="Failed: DID NOT RAISE">test_solucion.py:9: Failed</failure></testcase>
<testcase classname="test_solucion" name="test_luego" time="0.000">
<skipped type="pytest.skip" message="pendiente">test_solucion.py:11: pendiente</skipped></testcase>
<testcase classname="" name="test_otro" time="0.000">
<error message="collection failure">E   SyntaxError: expected ':'</error></testcase>
</testsuite></testsuites>"""


def test_separa_aserciones_de_excepciones() -> None:
    assert parse_junit(INFORME) == [
        CaseResult("test_suma", Outcome.PASSED, 2, ""),
        CaseResult("test_resta", Outcome.FAILED, 0, "assert 2 == 3"),
        CaseResult("test_div", Outcome.ERRORED, 0, "ZeroDivisionError: division by zero"),
        CaseResult("test_raises", Outcome.FAILED, 0, "Failed: DID NOT RAISE"),
        CaseResult("test_luego", Outcome.SKIPPED, 0, "pendiente"),
        CaseResult("test_otro", Outcome.ERRORED, 0, "collection failure"),
    ]


@pytest.mark.parametrize(
    ("xml", "error"),
    [("<testsuites>", ParseError), ('<testcase name="a" time="x"/>', ValueError)],
)
def test_un_informe_corrupto_lanza_error(xml: str, error: type[Exception]) -> None:
    with pytest.raises(error):
        parse_junit(xml)
