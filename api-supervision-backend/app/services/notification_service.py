"""
notification_service.py — Service d'envoi des notifications
"""

import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
import httpx

from app.core.config import settings
from app.core.database import get_pool

logger = logging.getLogger(__name__)


class NotificationService:

    def __init__(self):
        pass

    async def send_alert_notifications(self, alert: dict) -> None:
        try:
            pool = get_pool()
            async with pool.acquire() as conn:
                channels = await conn.fetch("""
                    SELECT id, name, type::text, target, is_enabled
                    FROM notification_channels
                    WHERE is_enabled = TRUE
                """)

                if not channels:
                    logger.info("Aucun canal de notification actif")
                    return

                tasks = []
                for channel in channels:
                    if channel['type'] == 'EMAIL':
                        tasks.append(
                            self._send_email(
                                to_address=channel['target'],
                                channel_name=channel['name'],
                                alert=alert
                            )
                        )
                    elif channel['type'] == 'WEBHOOK':
                        tasks.append(
                            self._send_webhook(
                                url=channel['target'],
                                alert=alert
                            )
                        )

                results = await asyncio.gather(*tasks, return_exceptions=True)
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.error(f"Erreur canal {i}: {result}")

        except Exception as e:
            logger.error(f"Erreur send_alert_notifications: {e}")

    async def _send_email(
        self,
        to_address: str,
        channel_name: str,
        alert: dict
    ) -> None:
        severity = alert.get('severity', 'INFO')

        # ── Configuration par sévérité ────────────────────
        severity_config = {
            'CRITICAL': {
                'color':        '#DC2626',
                'color_light':  '#FEE2E2',
                'color_dark':   '#991B1B',
                'label':        'CRITIQUE',
                'label_fr':     'Critique',
                'subject_prefix': '[CRITIQUE] Action immédiate requise',
                'icon_svg': '''<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#DC2626"/>
                    <path d="M12 7v6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="12" cy="17" r="1.5" fill="white"/>
                </svg>''',
                'banner_icon': '''<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="white" opacity="0.9"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="17" r="1" fill="#DC2626"/>
                </svg>''',
            },
            'WARNING': {
                'color':        '#D97706',
                'color_light':  '#FEF3C7',
                'color_dark':   '#92400E',
                'label':        'ATTENTION',
                'label_fr':     'Attention',
                'subject_prefix': '[ATTENTION] Surveillance requise',
                'icon_svg': '''<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#D97706"/>
                    <path d="M12 7v6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="12" cy="17" r="1.5" fill="white"/>
                </svg>''',
                'banner_icon': '''<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="white" opacity="0.9"/>
                    <path d="M12 7v6" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="12" cy="17" r="1.5" fill="#D97706"/>
                </svg>''',
            },
            'INFO': {
                'color':        '#2563EB',
                'color_light':  '#DBEAFE',
                'color_dark':   '#1E40AF',
                'label':        'INFORMATION',
                'label_fr':     'Information',
                'subject_prefix': '[INFO] Notification système',
                'icon_svg': '''<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#2563EB"/>
                    <path d="M12 11v6" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="12" cy="7.5" r="1.5" fill="white"/>
                </svg>''',
                'banner_icon': '''<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="white" opacity="0.9"/>
                    <path d="M12 11v6" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="12" cy="7.5" r="1.5" fill="#2563EB"/>
                </svg>''',
            },
        }

        cfg = severity_config.get(severity, severity_config['INFO'])
        color       = cfg['color']
        color_light = cfg['color_light']
        color_dark  = cfg['color_dark']
        label       = cfg['label']
        label_fr    = cfg['label_fr']
        banner_icon = cfg['banner_icon']

        # Formate la date
        created_at = alert.get('created_at', '')
        try:
            from datetime import datetime, timezone
            if hasattr(created_at, 'strftime'):
                date_str = created_at.strftime('%d/%m/%Y à %H:%M:%S UTC')
            else:
                dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
                date_str = dt.strftime('%d/%m/%Y à %H:%M:%S UTC')
        except Exception:
            date_str = str(created_at)

        subject = f"{cfg['subject_prefix']} — Supervision APIs"

        html_body = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alerte — Supervision APIs</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER LOGO ── -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#1E3A5F;border-radius:10px;padding:10px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:10px;vertical-align:middle;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td style="color:white;font-size:14px;font-weight:700;letter-spacing:0.5px;vertical-align:middle;">
                          SUPERVISION APIs
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CARTE PRINCIPALE ── -->
          <tr>
            <td style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1),0 1px 2px rgba(0,0,0,0.06);">

              <!-- Bandeau couleur sévérité -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:{color};padding:24px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:16px;width:48px;">
                          {banner_icon}
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">
                            ALERTE DE SUPERVISION
                          </div>
                          <div style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                            Sévérité {label_fr}
                          </div>
                        </td>
                        <td style="vertical-align:middle;text-align:right;">
                          <span style="display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:white;font-size:11px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:20px;">
                            {label}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contenu -->
                <tr>
                  <td style="padding:32px;">

                    <!-- Message alerte -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:{color_light};border-left:4px solid {color};border-radius:0 8px 8px 0;padding:16px 20px;">
                          <div style="color:#6B7280;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">
                            MESSAGE
                          </div>
                          <div style="color:#111827;font-size:15px;font-weight:500;line-height:1.5;">
                            {alert.get('message', 'Alerte déclenchée')}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Tableau détails -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:28px;">

                      <!-- En-tête tableau -->
                      <tr style="background:#F9FAFB;">
                        <td colspan="2" style="padding:12px 16px;border-bottom:1px solid #E5E7EB;">
                          <div style="color:#374151;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                            Détails de l'alerte
                          </div>
                        </td>
                      </tr>

                      <!-- Sévérité -->
                      <tr style="border-bottom:1px solid #F3F4F6;">
                        <td style="padding:13px 16px;width:40%;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:8px;vertical-align:middle;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                              </td>
                              <td style="color:#6B7280;font-size:13px;font-weight:500;vertical-align:middle;">
                                Sévérité
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding:13px 16px;vertical-align:top;">
                          <span style="display:inline-block;background:{color_light};color:{color_dark};font-size:12px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:0.5px;">
                            {label_fr}
                          </span>
                        </td>
                      </tr>

                      <!-- Statut -->
                      <tr style="background:#FAFAFA;border-bottom:1px solid #F3F4F6;">
                        <td style="padding:13px 16px;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:8px;vertical-align:middle;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="#9CA3AF" stroke-width="2"/>
                                  <polyline points="12 6 12 12 16 14" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                              </td>
                              <td style="color:#6B7280;font-size:13px;font-weight:500;vertical-align:middle;">
                                Statut
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding:13px 16px;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:6px;vertical-align:middle;">
                                <div style="width:8px;height:8px;background:#EF4444;border-radius:50%;"></div>
                              </td>
                              <td style="color:#374151;font-size:13px;font-weight:600;vertical-align:middle;">
                                Ouvert — Non traité
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Date -->
                      <tr>
                        <td style="padding:13px 16px;vertical-align:top;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:8px;vertical-align:middle;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#9CA3AF" stroke-width="2"/>
                                  <line x1="16" y1="2" x2="16" y2="6" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
                                  <line x1="8" y1="2" x2="8" y2="6" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
                                  <line x1="3" y1="10" x2="21" y2="10" stroke="#9CA3AF" stroke-width="2"/>
                                </svg>
                              </td>
                              <td style="color:#6B7280;font-size:13px;font-weight:500;vertical-align:middle;">
                                Déclenchée le
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding:13px 16px;color:#374151;font-size:13px;font-weight:500;vertical-align:top;">
                          {date_str}
                        </td>
                      </tr>
                    </table>

                    <!-- Bouton CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                      <tr>
                        <td align="center">
                          <a href="http://localhost:3000/alerts"
                             style="display:inline-block;background:{color};color:white;font-size:14px;font-weight:600;letter-spacing:0.3px;padding:14px 32px;border-radius:8px;text-decoration:none;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="color:white;font-size:14px;font-weight:600;padding-right:8px;vertical-align:middle;">
                                  Traiter l'alerte
                                </td>
                                <td style="vertical-align:middle;">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <line x1="5" y1="12" x2="19" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                                    <polyline points="12 5 19 12 12 19" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Pied de carte -->
                <tr>
                  <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:6px;vertical-align:middle;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="#9CA3AF" stroke-width="2"/>
                                  <polyline points="12 6 12 12 16 14" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                              </td>
                              <td style="color:#9CA3AF;font-size:12px;vertical-align:middle;">
                                Notification automatique
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="text-align:right;">
                          <span style="color:#9CA3AF;font-size:12px;">
                            Plateforme de Supervision d'APIs
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="color:#94A3B8;font-size:11px;margin:0;line-height:1.6;">
                Vous recevez cet email car vous êtes inscrit aux alertes de supervision.<br>
                Pour vous désabonner, rendez-vous dans les
                <a href="http://localhost:3000/notifications" style="color:#64748B;text-decoration:underline;">paramètres de notification</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""

        text_body = f"""
ALERTE {label} — Supervision APIs
{'='*50}

{alert.get('message', 'Alerte déclenchée')}

DÉTAILS
-------
Sévérité   : {label_fr}
Statut     : Ouvert — Non traité
Déclenchée : {date_str}

Traiter l'alerte : http://localhost:3000/alerts

---
Notification automatique — Plateforme de Supervision d'APIs
        """

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
        msg['To']      = to_address

        msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html',  'utf-8'))

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            logger.info(f"Email envoyé à {to_address} — canal: {channel_name}")

        except Exception as e:
            logger.error(f"Erreur envoi email à {to_address}: {e}")
            raise

    async def _send_webhook(self, url: str, alert: dict) -> None:
        severity = alert.get('severity', 'INFO')
        color_map = {
            'INFO':     '#2563EB',
            'WARNING':  '#D97706',
            'CRITICAL': '#DC2626',
        }
        label_map = {
            'INFO':     'Information',
            'WARNING':  'Attention',
            'CRITICAL': 'Critique',
        }

        payload = {
            "text": f"*Alerte {label_map.get(severity, severity)}* — Supervision APIs",
            "attachments": [{
                "color": color_map.get(severity, '#6B7280'),
                "fields": [
                    {
                        "title": "Message",
                        "value": alert.get('message', 'Alerte déclenchée'),
                        "short": False
                    },
                    {
                        "title": "Sévérité",
                        "value": label_map.get(severity, severity),
                        "short": True
                    },
                    {
                        "title": "Statut",
                        "value": "Ouvert — Non traité",
                        "short": True
                    },
                ],
                "footer": "Plateforme de Supervision d'APIs",
            }]
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                logger.info(f"Webhook envoyé à {url}")
        except Exception as e:
            logger.error(f"Erreur webhook {url}: {e}")
            raise