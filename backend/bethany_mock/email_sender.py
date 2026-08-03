from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


def send_verification_email(to_address: str, code: str) -> None:
    """Send a BethAny email-verification code.

    Real delivery uses `smtplib` against whatever SMTP relay is configured via env vars
    (any provider works — SendGrid/Mailgun/Resend/etc. all expose a standard SMTP relay,
    so no vendor SDK dependency is needed, see specs/009-verificacion-correo/research.md
    Decision 2). When `SMTP_HOST` isn't set (the local dev default — the real credential
    only lives in the deployed environment's env vars, never in the repo), the code is
    printed instead so local development and testing never require a real inbox.

    Uses `print` rather than the `logging` module: uvicorn only configures handlers for
    its own loggers, not the root logger, so a `logging.getLogger(__name__).info(...)` call
    here would silently never appear anywhere — confirmed while testing this feature. The
    rest of this backend (see api.py `serve()`) already uses plain `print` for the same reason.
    """
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    if not smtp_host:
        print(f"BethAny verification code for {to_address}: {code} (SMTP_HOST unset, not sending a real email)")
        return

    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_username = os.environ.get("SMTP_USERNAME", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    from_address = os.environ.get("SMTP_FROM_ADDRESS", smtp_username)

    message = EmailMessage()
    message["Subject"] = "Tu código de verificación de BethAny"
    message["From"] = from_address
    message["To"] = to_address
    message.set_content(f"Tu código de verificación es: {code}\n\nCaduca en 24 horas.")

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        if smtp_username:
            server.login(smtp_username, smtp_password)
        server.send_message(message)
