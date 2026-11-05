from dataclasses import dataclass
from enum import StrEnum


class Language(StrEnum):
    C = "c"
    CPP = "cpp"
    PYTHON = "python"
    JAVA = "java"


@dataclass(frozen=True)
class LanguageSpec:
    source_name: str
    # None si el lenguaje se interpreta directamente
    compile_args: list[str] | None
    # Archivo que genera la compilación y que se reutiliza en la ejecución
    artifact: str | None
    run_args: list[str]
    proc_limit: int


LANGUAGES: dict[Language, LanguageSpec] = {
    Language.C: LanguageSpec(
        source_name="main.c",
        compile_args=["/usr/bin/gcc", "-O2", "-std=c17", "main.c", "-o", "main", "-lm"],
        artifact="main",
        run_args=["./main"],
        proc_limit=4,
    ),
    Language.CPP: LanguageSpec(
        source_name="main.cpp",
        compile_args=["/usr/bin/g++", "-O2", "-std=c++20", "main.cpp", "-o", "main"],
        artifact="main",
        run_args=["./main"],
        proc_limit=4,
    ),
    Language.PYTHON: LanguageSpec(
        source_name="main.py",
        compile_args=None,
        artifact=None,
        run_args=["/usr/bin/python3", "main.py"],
        proc_limit=4,
    ),
    # La JVM crea varios hilos propios, por eso necesita un límite de procesos alto
    Language.JAVA: LanguageSpec(
        source_name="Main.java",
        compile_args=["/usr/bin/javac", "Main.java"],
        artifact="Main.class",
        run_args=["/usr/bin/java", "-XX:+UseSerialGC", "-Xss64m", "-cp", ".", "Main"],
        proc_limit=64,
    ),
}
