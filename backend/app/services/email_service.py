import json
import logging
import urllib.error
import urllib.request
from typing import Dict, Any, Optional

from app.config.settings import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class EmailService:
    @staticmethod
    def send_email(
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches transactional emails via Brevo (Sendinblue) API.
        Includes graceful fallbacks, structured logging, and non-blocking delivery.
        """
        if not settings.BREVO_API_KEY:
            logger.warning("[EmailService] No BREVO_API_KEY configured. Email skipped.")
            return {"success": False, "reason": "No API key configured"}

        payload = {
            "sender": {
                "name": settings.EMAIL_FROM_NAME or "ClubOps AI",
                "email": settings.EMAIL_FROM or "noreply@clubops.ai",
            },
            "to": [{"email": to_email, "name": to_name or to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        if text_content:
            payload["textContent"] = text_content

        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY.strip(),
            "content-type": "application/json",
        }

        try:
            req = urllib.request.Request(
                BREVO_API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                resp_body = response.read().decode("utf-8")
                data = json.loads(resp_body) if resp_body else {}
                logger.info(f"[EmailService] Email sent successfully to {to_email} (Subject: '{subject}')")
                return {"success": True, "message_id": data.get("messageId")}
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8") if err.fp else ""
            logger.warning(
                f"[EmailService] Brevo API HTTP {err.code} to {to_email}: {err_body}"
            )
            # Check for IP Whitelist restriction
            if err.code == 401 and "authorised_ips" in err_body:
                logger.error(
                    "[EmailService] Brevo security alert: Current public IP is not in your Brevo Authorised IPs list. "
                    "Authorize your current IP at https://app.brevo.com/security/authorised_ips to enable live email delivery."
                )
            return {"success": False, "status_code": err.code, "error": err_body}
        except Exception as ex:
            logger.error(f"[EmailService] Failed to send email to {to_email}: {ex}")
            return {"success": False, "error": str(ex)}

    @staticmethod
    def build_notification_html(
        title: str,
        message: str,
        badge_text: str = "ClubOps Notification",
        badge_color: str = "#059669",
        action_url: Optional[str] = None,
        action_label: str = "View in ClubOps",
    ) -> str:
        """Constructs an enterprise-grade HTML email template."""
        button_html = ""
        if action_url:
            button_html = f"""
            <div style="margin-top: 24px; text-align: center;">
              <a href="{action_url}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                {action_label} &rarr;
              </a>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{title}</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #064e3b 0%, #059669 100%); padding: 28px 32px; color: #ffffff;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                {badge_text}
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3;">{title}</h1>
            </div>

            <!-- Body Content -->
            <div style="padding: 32px; color: #334155; font-size: 14px; line-height: 1.6;">
              <p style="margin-top: 0; color: #1e293b; font-size: 15px;">{message}</p>
              {button_html}
            </div>

            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 16px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
              Sent via <strong>ClubOps AI</strong> &bull; Campus Student Organization OS
            </div>
          </div>
        </body>
        </html>
        """
