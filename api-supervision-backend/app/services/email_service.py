import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("SMTP_FROM")
FROM_NAME = os.getenv("SMTP_FROM_NAME", "Supervision APIs")


def _send_html_email(to_email: str, subject: str, html_content: str) -> bool:
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = to_email

        message.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, message.as_string())

        print(f"✅ Email envoyé à {to_email}")
        return True

    except Exception as e:
        print(f"❌ Erreur envoi email : {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_invitation_email(
    to_email: str,
    team_name: str,
    invited_by: str,
    acceptance_link: str,
    rejection_link: str,
):
    html_content = f"""
    <html>
        <body style="font-family: Sora, sans-serif; background-color: #f5f5f5; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; margin-top: 0;">Tu as une nouvelle invitation ! 🎉</h2>

                <p style="color: #6b7280; line-height: 1.6;">
                    <strong style="color: #1f2937;">{invited_by}</strong> t'a invité à rejoindre l'équipe
                    <strong style="color: #1f2937;">{team_name}</strong> sur Traceon.
                </p>

                <div style="margin: 30px 0; text-align: center;">
                    <a href="{acceptance_link}" style="
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #E07FA0;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        margin-right: 10px;
                    ">
                        ✓ Accepter l'invitation
                    </a>

                    <a href="{rejection_link}" style="
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #ef4444;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                    ">
                        ✗ Rejeter
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

                <p style="color: #6b7280; font-size: 12px;">
                    Si tu n'as pas demandé cette invitation, tu peux ignorer cet email.<br>
                    <strong>Lien d'acceptation :</strong>
                    <a href="{acceptance_link}" style="color: #E07FA0;">{acceptance_link}</a>
                </p>

                <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">
                    © Traceon API Supervision Platform
                </p>
            </div>
        </body>
    </html>
    """

    return _send_html_email(
        to_email=to_email,
        subject=f"{invited_by} t'a invité à rejoindre '{team_name}'",
        html_content=html_content,
    )


def send_alert_email(
    to_email: str,
    alert_title: str,
    alert_message: str,
):
    html_content = f"""
    <html>
        <body style="font-family: Sora, sans-serif;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #fff5f5; border-left: 4px solid #ef4444; padding: 20px;">
                <h2 style="color: #dc2626; margin-top: 0;">🚨 {alert_title}</h2>
                <p style="color: #6b7280;">{alert_message}</p>
                <a href="http://localhost:3000/alerts" style="
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #ef4444;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                ">
                    Voir l'alerte
                </a>
            </div>
        </body>
    </html>
    """

    return _send_html_email(
        to_email=to_email,
        subject=f"🚨 Alerte : {alert_title}",
        html_content=html_content,
    )


def send_verification_email(
    to_email: str,
    user_name: str,
    verification_link: str,
):
    html_content = f"""
    <html>
        <body style="font-family: Sora, sans-serif; background-color: #f5f5f5; padding: 20px;">
            <div style="
                max-width: 520px;
                margin: 0 auto;
                background: white;
                border-radius: 14px;
                padding: 35px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            ">
                <h2 style="margin-top:0;color:#111827;">
                    Bienvenue sur Traceon 🚀
                </h2>

                <p style="color:#6b7280;line-height:1.7;">
                    Bonjour <strong>{user_name}</strong>,
                </p>

                <p style="color:#6b7280;line-height:1.7;">
                    Merci d’avoir créé un compte sur Traceon.
                    Pour activer votre compte, veuillez vérifier votre adresse email.
                </p>

                <div style="margin:35px 0;text-align:center;">
                    <a href="{verification_link}" style="
                        display:inline-block;
                        padding:14px 28px;
                        background:#E07FA0;
                        color:white;
                        text-decoration:none;
                        border-radius:10px;
                        font-weight:700;
                    ">
                        Vérifier mon email
                    </a>
                </div>

                <p style="font-size:13px;color:#9ca3af;">
                    Si vous n’êtes pas à l’origine de cette inscription,
                    vous pouvez ignorer cet email.
                </p>

                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

                <p style="font-size:11px;color:#9ca3af;text-align:center;">
                    © Traceon API Supervision Platform
                </p>
            </div>
        </body>
    </html>
    """

    return _send_html_email(
        to_email=to_email,
        subject="Vérifie ton adresse email",
        html_content=html_content,
    )