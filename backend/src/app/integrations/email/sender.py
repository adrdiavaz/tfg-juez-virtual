from typing import Protocol

from app.core.config import settings
from app.integrations.email.smtp import SmtpEmailSender


class EmailSender(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...


def get_email_sender() -> EmailSender:
    return SmtpEmailSender(
        settings.smtp_host,
        settings.smtp_port,
        settings.smtp_user,
        settings.smtp_password,
        settings.smtp_starttls,
        settings.mail_from,
    )
