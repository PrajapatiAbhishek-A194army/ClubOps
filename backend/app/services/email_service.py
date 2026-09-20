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

    @classmethod
    def send_club_head_credentials_email(
        cls,
        to_email: str,
        to_name: str,
        club_name: str,
        password: str,
        login_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches an official onboarding and credentials email to a newly appointed Club Head.
        Includes their email, password, club name, and portal login link.
        """
        portal_url = login_url or "http://localhost:5173/login"
        name_display = to_name or to_email.split("@")[0]

        subject = f"👑 You've been appointed as Club Head of {club_name} - Login Credentials"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Club Head Appointment</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%); padding: 32px 32px; color: #ffffff;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                Leadership Appointment
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3;">
                Welcome, Club Head!
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
                You have been designated as the operational leader of <strong>{club_name}</strong>.
              </p>
            </div>

            <!-- Body Content -->
            <div style="padding: 32px; color: #334155; font-size: 14px; line-height: 1.6;">
              <p style="margin-top: 0; font-size: 15px; color: #1e293b;">
                Hello <strong>{name_display}</strong>,
              </p>
              <p style="color: #475569;">
                The Campus President has officially appointed you as the <strong>Club Head</strong> of <strong>{club_name}</strong> in ClubOps AI. You now have full operational command over event planning, team delegation, volunteer rosters, and club announcements.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; color: #6b21a8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                  Your ClubOps Login Credentials
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px; font-weight: 600;">Login Email:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: 700;">{to_email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                    <td style="padding: 6px 0; color: #6b21a8; font-family: monospace; font-size: 15px; font-weight: 700;">{password}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Assigned Role:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">Club Head ({club_name})</td>
                  </tr>
                </table>
              </div>

              <!-- Action Button -->
              <div style="margin: 28px 0 20px 0; text-align: center;">
                <a href="{portal_url}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.25);">
                  Log In to ClubOps Portal &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                For security reasons, please change your password under Settings after your first login.
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 16px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
              Sent via <strong>ClubOps AI</strong> &bull; Campus Student Organization Operating System
            </div>
          </div>
        </body>
        </html>
        """

        text_content = (
            f"Hello {name_display},\n\n"
            f"You have been officially appointed as the Club Head of {club_name} in ClubOps AI.\n\n"
            f"Your Login Credentials:\n"
            f"Login Email: {to_email}\n"
            f"Password: {password}\n"
            f"Role: Club Head\n"
            f"Portal URL: {portal_url}\n\n"
            f"Log in and take charge of your club operations!"
        )

        return cls.send_email(
            to_email=to_email,
            to_name=name_display,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )

