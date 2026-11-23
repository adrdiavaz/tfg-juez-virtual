import httpx
import pytest

from app.core.config import settings


@pytest.fixture(scope="module")
def go_judge_disponible() -> None:
    """Omite el módulo si no responde un go-judge real (docker compose up -d)."""
    headers = (
        {"Authorization": f"Bearer {settings.go_judge_auth_token}"}
        if settings.go_judge_auth_token
        else {}
    )
    try:
        httpx.get(f"{settings.go_judge_url}/version", headers=headers, timeout=2).raise_for_status()
    except httpx.HTTPError:
        pytest.skip("go-judge no está disponible")
