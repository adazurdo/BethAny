from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

RESEND_API_URL = "https://api.resend.com/emails"
REQUEST_TIMEOUT_SECONDS = 10


def send_verification_email(to_address: str, code: str) -> None:
    """Send a BethAny email-verification code via the Resend HTTP API.

    Uses Resend's HTTPS API rather than SMTP: Railway blocks outbound SMTP ports (confirmed
    in production via `TimeoutError: [Errno 110] Connection timed out` on `smtplib`'s
    `sock.connect()`, which then hung the whole registration request until the OS-level
    timeout fired), so any PaaS deploy needs a plain-HTTPS delivery path instead. Reuses
    `SMTP_PASSWORD` as the bearer token (it already holds the Resend API key from the earlier
    SMTP setup) so no Railway env var changes are needed on top of this fix.

    When `SMTP_PASSWORD` isn't set (the local dev default), the code is printed instead so
    local development and testing never require a real inbox.

    Uses `print` rather than the `logging` module: uvicorn only configures handlers for
    its own loggers, not the root logger, so a `logging.getLogger(__name__).info(...)` call
    here would silently never appear anywhere — confirmed while testing this feature. The
    rest of this backend (see api.py `serve()`) already uses plain `print` for the same reason.
    """
    api_key = os.environ.get("SMTP_PASSWORD", "").strip()
    if not api_key:
        print(f"BethAny verification code for {to_address}: {code} (SMTP_PASSWORD unset, not sending a real email)")
        return

    from_address = os.environ.get("SMTP_FROM_ADDRESS", "").strip() or "noreply@bethanypredictions.com"
    body = json.dumps(
        {
            "from": from_address,
            "to": [to_address],
            "subject": "Tu código de verificación de BethAny",
            "text": f"Tu código de verificación es: {code}\n\nCaduca en 24 horas.",
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        RESEND_API_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Resend sits behind Cloudflare, which blocks urllib's default "Python-urllib/x.y"
            # User-Agent as a bot signature (403 "Access Denied") — confirmed in production.
            "User-Agent": "BethAny-Backend/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Resend respondio {exc.code} al enviar el correo a {to_address}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"No se pudo contactar Resend: {exc.reason}") from exc
