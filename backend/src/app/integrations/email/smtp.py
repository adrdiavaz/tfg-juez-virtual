from email.message import EmailMessage

import aiosmtplib


class SmtpEmailSender:
    def __init__(
        self,
        host: str,
        port: int,
        user: str | None,
        password: str | None,
        starttls: bool,
        sender: str,
    ) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.starttls = starttls
        self.sender = sender

    async def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        await aiosmtplib.send(
            message,
            hostname=self.host,
            port=self.port,
            username=self.user,
            password=self.password,
            start_tls=self.starttls,
            timeout=10,
        )
