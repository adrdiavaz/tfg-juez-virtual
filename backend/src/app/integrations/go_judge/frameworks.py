from dataclasses import dataclass
from enum import StrEnum


class Framework(StrEnum):
    PYTEST = "pytest"


@dataclass(frozen=True)
class FrameworkSpec:
    # shortcut: nombre fijo por framework; pasará a ser un dato de la actividad
    student_file: str
    run_args: list[str]
    env: list[str]
    # Informe JUnit XML que se copia fuera del sandbox
    report_path: str
    # Coste del runtime, que se suma al límite de la actividad para no restárselo al alumno
    memory_overhead_mb: int
    cpu_overhead_ms: int
    proc_limit: int


FRAMEWORKS: dict[Framework, FrameworkSpec] = {
    # Sin rutas: pytest descubre los test_*.py del directorio de trabajo
    Framework.PYTEST: FrameworkSpec(
        student_file="solucion.py",
        run_args=[
            "/usr/bin/python3",
            "-m",
            "pytest",
            "-p",
            "no:cacheprovider",
            "-q",
            "--junitxml=report.xml",
        ],
        env=["PATH=/usr/bin:/bin", "PYTHONDONTWRITEBYTECODE=1", "HOME=/tmp"],
        report_path="report.xml",
        memory_overhead_mb=32,
        cpu_overhead_ms=300,
        proc_limit=4,
    ),
}
