import smtplib
import ssl
from email.mime.text import MIMEText
from flask import current_app

def _send_mail(to_email, subject, body):
    """Internal helper to send email using configured SMTP settings."""
    mail_server = current_app.config.get("MAIL_SERVER") or ""
    mail_port = int(current_app.config.get("MAIL_PORT") or 587)
    mail_use_tls = bool(current_app.config.get("MAIL_USE_TLS"))
    mail_username = current_app.config.get("MAIL_USERNAME") or ""
    mail_password = current_app.config.get("MAIL_PASSWORD") or ""
    sender = current_app.config.get("MAIL_DEFAULT_SENDER") or mail_username

    if not (mail_server and sender):
        current_app.logger.warning("Email NOT sent: SMTP not configured.")
        return False

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(mail_server, mail_port, timeout=10) as server:
            if mail_use_tls:
                server.starttls(context=context)
            if mail_username and mail_password:
                server.login(mail_username, mail_password)
            server.sendmail(sender, [to_email], msg.as_string())
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_welcome_email(email, full_name, user_role, password=None):
    """Send a welcome email when a consultant is successfully added."""
    subject = "Welcome to Our Platform"
    
    body_lines = [
        f"Dear {full_name},",
        "",
        f"We are pleased to inform you that you have been successfully added as a {user_role} to our platform.",
        "",
        "You can now access your account and start collaborating with the team. Please use your registered email to log in and explore your assigned tasks and responsibilities.",
    ]
    
    if password:
        body_lines.append("")
        body_lines.append("Your login credentials are:")
        body_lines.append(f"Email: {email}")
        body_lines.append(f"Password: {password}")
    
    body_lines.append("")
    body_lines.append("If you have any questions or need assistance, feel free to reach out to us.")
    body_lines.append("")
    body_lines.append("Best regards,")
    body_lines.append("SwiftBIM Team")
    
    return _send_mail(email, subject, "\n".join(body_lines))

def send_project_creation_email(full_name, email, project_name, start_date, due_date):
    """Send an email notification about a new project assignment."""
    subject = f"Project Assignment: {project_name}"
    body_lines = [
        f"Hello {full_name},",
        "",
        f"You have been involved in a new project: {project_name}.",
        "",
        f"Start Date: {start_date}",
        f"Due Date: {due_date}",
        "",
        "Please check your dashboard for more details.",
        "",
        "Best regards,",
        "SwiftBIM System"
    ]
    return _send_mail(email, subject, "\n".join(body_lines))

def send_invitation_email(email, full_name, invitation_link="https://projectmanagement.swifterz.ae/login"):
    """Send an invitation email to a new employee."""
    
    subject = "Invitation to Join Our Team"
    
    body_lines = [
        f"Dear {full_name},",
        "",
        "You have been invited to join our organization. We are excited to have you on board!",
        "Please click the link below to accept the invitation and log in:",
        f"{invitation_link}",
        "",
        "Once completed, you will be able to access your dashboard and begin your work.",
        "We look forward to working with you.",
        "",
        "Best regards,",
        "SwiftBIM Team"
    ]

    return _send_mail(email, subject, "\n".join(body_lines))