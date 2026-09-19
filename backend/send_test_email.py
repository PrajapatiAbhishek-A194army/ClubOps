import sys
from app.services.email_service import EmailService

def main():
    recipient = sys.argv[1] if len(sys.argv) > 1 else "prajapatibhagudevi33@gmail.com"
    subject = "ClubOps AI Demo Notification - System Test"
    html = EmailService.build_notification_html(
        title="ClubOps AI Platform - Live Integration Test",
        message=(
            f"Hello,<br><br>"
            f"This is a live test notification sent directly from your <strong>ClubOps AI</strong> platform via Brevo API.<br><br>"
            f"All notification pipelines, AI briefing alerts, and volunteer dispatch engines are operational."
        ),
        badge_text="Brevo Live Test",
        badge_color="#059669",
        action_url="http://localhost:5173/app",
        action_label="Open ClubOps Dashboard",
    )

    print(f"Dispatching demo email to: {recipient}...")
    res = EmailService.send_email(
        to_email=recipient,
        to_name="Bhagudevi Prajapati",
        subject=subject,
        html_content=html,
    )
    print("Dispatch Result:", res)
    if res.get("success"):
        print("\nSUCCESS: Email delivered through Brevo! Check inbox / spam folder.")
    else:
        print("\nNotice: If Brevo returned an unauthorized IP message, add your IP address to your Brevo security settings.")

if __name__ == "__main__":
    main()
