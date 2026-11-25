from fastapi import HTTPException, status


class IdentifierTaken(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_409_CONFLICT, {"code": "identifier_taken"})


class EmailTaken(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_409_CONFLICT, {"code": "email_taken"})


class TeacherNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, {"code": "teacher_not_found"})


class InvalidStatus(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_409_CONFLICT, {"code": "invalid_status"})
