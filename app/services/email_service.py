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

def send_invitation_email(
    to_email: str,
    team_name: str,
    invited_by: str,
    acceptance_link: str,
    rejection_link: str,
):
    """
    Envoie un email d'invitation pour rejoindre une équipe via SMTP.
    """
    try:
        print(f"📧 Tentative d'envoi à {to_email}...")
        print(f"SMTP_SERVER: {SMTP_SERVER}")
        print(f"SMTP_EMAIL: {SMTP_EMAIL}")
        
        # Créer le message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"{invited_by} t'a invité à rejoindre '{team_name}'"
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = to_email

        # Contenu HTML
        html_content = f"""
        <html>
            <body style="font-family: Sora, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <h2 style="color: #1f2937; margin-top: 0;">Tu as une nouvelle invitation ! 🎉</h2>
                    
                    <p style="color: #6b7280; line-height: 1.6;">
                        <strong style="color: #1f2937;">{invited_by}</strong> t'a invité à rejoindre l'équipe <strong style="color: #1f2937;">{team_name}</strong> sur la plateforme Supervision.
                    </p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{acceptance_link}" style="
                            display: inline-block;
                            padding: 12px 30px;
                            background-color: #3b82f6;
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
                        <strong>Lien d'acceptation :</strong> <a href="{acceptance_link}" style="color: #3b82f6;">{acceptance_link}</a>
                    </p>
                    
                    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">
                        © Supervision API Platform
                    </p>
                </div>
            </body>
        </html>
        """

        part = MIMEText(html_content, "html")
        message.attach(part)

        # Envoyer l'email
        print("🔌 Connexion au serveur SMTP...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            print("🔐 Authentification...")
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            print("📤 Envoi du message...")
            server.sendmail(FROM_EMAIL, to_email, message.as_string())

        print(f"✅ Email d'invitation envoyé à {to_email}")
        return True

    except Exception as e:
        print(f"❌ Erreur envoi email : {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_alert_email(
    to_email: str,
    alert_title: str,
    alert_message: str,
):
    """
    Envoie un email d'alerte.
    """
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = f"🚨 Alerte : {alert_title}"
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = to_email

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

        part = MIMEText(html_content, "html")
        message.attach(part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, message.as_string())

        print(f"✅ Email d'alerte envoyé à {to_email}")
        return True

    except Exception as e:
        print(f"❌ Erreur envoi email : {e}")
        import traceback
        traceback.print_exc()
        return False