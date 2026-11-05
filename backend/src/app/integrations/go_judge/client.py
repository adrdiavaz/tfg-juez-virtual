import httpx
from pydantic import TypeAdapter, ValidationError

from app.core.config import Settings
from app.integrations.go_judge.dto.request import Cmd
from app.integrations.go_judge.dto.result import Result
from app.integrations.go_judge.exceptions import GoJudgeError

_results = TypeAdapter(list[Result])


def create_http_client(settings: Settings) -> httpx.AsyncClient:
    headers = (
        {"Authorization": f"Bearer {settings.go_judge_auth_token}"}
        if settings.go_judge_auth_token
        else {}
    )
    return httpx.AsyncClient(
        base_url=settings.go_judge_url, timeout=settings.go_judge_timeout, headers=headers
    )


class GoJudgeClient:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self.http = http

    async def run(self, cmds: list[Cmd]) -> list[Result]:
        body = {"cmd": [c.model_dump(by_alias=True, exclude_none=True) for c in cmds]}
        try:
            response = await self.http.post("/run", json=body)
            response.raise_for_status()
            return _results.validate_python(response.json())
        except (httpx.HTTPError, ValueError, ValidationError) as e:
            raise GoJudgeError(f"go-judge /run falló: {e}") from e

    async def delete_file(self, file_id: str) -> None:
        try:
            (await self.http.delete(f"/file/{file_id}")).raise_for_status()
        except httpx.HTTPError as e:
            raise GoJudgeError(f"go-judge DELETE /file/{file_id} falló: {e}") from e
