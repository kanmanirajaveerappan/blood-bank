import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via configured SMTP (e.g. Gmail)."""
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP credentials not configured. Skipping email dispatch.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = to_email

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())

        logger.info(f"Successfully sent email to {to_email} with subject: '{subject}'")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """Send password reset OTP email."""
    subject = "RedRadius — Your Password Reset Verification Code"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; background-color: #0b1528; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ef4444; margin: 0;">🩸 RedRadius</h2>
            <p style="color: #94a3b8; font-size: 13px;">Find Nearby. Save Lives. • Emergency Blood Donor Coordination</p>
        </div>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(239, 68, 68, 0.3); padding: 20px; border-radius: 8px; text-align: center;">
            <p style="font-size: 15px; color: #e2e8f0; margin-bottom: 15px;">You requested a password reset for your RedRadius account.</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00ff88; background: #060d1d; padding: 14px; border-radius: 6px; display: inline-block; font-family: monospace;">
                {otp_code}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 15px;">This verification code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px;">© 2026 RedRadius Emergency Response System</p>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_emergency_alert_email(to_email: str, recipient_name: str, blood_group: str, hospital_name: str, units: int, distance: str, alert_id: str) -> bool:
    """Send real-time emergency dispatch alert to donor's email."""
    subject = f"🚨 URGENT: Emergency Blood Request ({blood_group}) — {hospital_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; background-color: #0b1528; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 540px; margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">CRITICAL EMERGENCY</span>
            <h2 style="color: #ffffff; margin-top: 10px;">RedRadius Donor Dispatch</h2>
        </div>
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.4); padding: 20px; border-radius: 8px;">
            <p style="font-size: 16px; margin: 0 0 10px 0;">Hello <strong>{recipient_name}</strong>,</p>
            <p style="color: #e2e8f0; font-size: 14px;">An emergency patient urgently requires <strong>{blood_group}</strong> blood at <strong>{hospital_name}</strong>.</p>
            
            <table style="width: 100%; margin-top: 15px; border-collapse: collapse; font-size: 14px;">
                <tr><td style="color: #94a3b8; padding: 6px 0;">Blood Group:</td><td style="color: #ef4444; font-weight: bold;">{blood_group}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Units Required:</td><td style="color: #ffffff; font-weight: bold;">{units} Units</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Hospital:</td><td style="color: #00d2ff; font-weight: bold;">{hospital_name}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Distance from you:</td><td style="color: #00ff88; font-weight: bold;">{distance}</td></tr>
            </table>

            <div style="text-align: center; margin-top: 25px;">
                <a href="http://localhost:5173/navigation/{alert_id}" style="background: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                    View Route & Respond Now ➔
                </a>
            </div>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px;">RedRadius Automated Dispatch Command • Coimbatore</p>
    </div>
    """
    return send_email(to_email, subject, html_body)
