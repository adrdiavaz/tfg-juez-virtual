from fastapi import HTTPException, status


class InvalidCredentials(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, {"code": "invalid_credentials"})


class AccountPending(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, {"code": "account_pending"})


class AccountDisabled(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, {"code": "account_disabled"})
