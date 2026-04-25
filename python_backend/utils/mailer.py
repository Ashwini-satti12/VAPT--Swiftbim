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


def send_project_added_confirmation_email(full_name, email, project_name, start_date, due_date):
    """Send an email confirmation to the user who created the project."""
    subject = f"Project Created: {project_name}"
    body_lines = [
        f"Hello {full_name or 'User'},",
        "",
        f"You added a new project: {project_name}.",
        "",
        f"Start Date: {start_date}",
        f"Due Date: {due_date}",
        "",
        "You can view it in your Projects dashboard.",
        "",
        "Best regards,",
        "SwiftBIM System",
    ]
    return _send_mail(email, subject, "\n".join(body_lines))


def send_vendor_outsource_opportunity_email(email, contact_name, project_name, bid_deadline, budget_ceiling, currency="AED"):
    """Notify a vendor about a new outsource/bidding opportunity."""
    subject = f"New Outsource Opportunity: {project_name}"
    body_lines = [
        f"Hello {contact_name or 'Vendor'},",
        "",
        f"A new outsource project is available for bidding: {project_name}.",
        "",
        f"Bid Deadline: {bid_deadline}",
        f"Budget Ceiling: {currency} {budget_ceiling}",
        "",
        "Please log in to view the opportunity details and submit your bid.",
        "",
        "Best regards,",
        "SwiftBIM System",
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


def send_employee_status_email(email, full_name, new_status, company_label="this company"):
    """
    Notify an employee that their account status changed.

    new_status: 'active' | 'inactive' (case-insensitive)
    """
    status = (new_status or "").strip().lower()
    is_active = status == "active"

    subject = "Account Activated" if is_active else "Account Inactivated"
    body_lines = [
        f"Dear {full_name or 'User'},",
        "",
        (
            f"Your account has been activated. You are now active in {company_label}."
            if is_active
            else f"Your account has been inactivated. You are now inactive in {company_label}."
        ),
        "",
        "If you believe this is a mistake, please contact your administrator.",
        "",
        "Best regards,",
        "SwiftBIM Team",
    ]

    return _send_mail(email, subject, "\n".join(body_lines))


def send_employee_profile_updated_email(email, full_name, updated_fields=None, updated_by_role="Technical Director"):
    """
    Notify an employee that their profile was edited by an admin/TD.

    updated_fields: list[str] of human readable field names.
    """
    # updated_fields can be:
    # - list[str] (field labels)
    # - list[tuple[str, str]] (label, value) OR list[dict] like {"label":..., "value":...}
    fields = updated_fields or []
    subject = "Your profile details were updated"

    body_lines = [
        f"Dear {full_name or 'User'},",
        "",
        f"Your profile details were updated by {updated_by_role}.",
    ]

    if fields:
        body_lines.extend(["", "Updated fields:"])
        for item in fields:
            if isinstance(item, (tuple, list)) and len(item) >= 2:
                label = str(item[0]).strip()
                value = str(item[1]).strip()
                body_lines.append(f"- {label}: {value}")
            elif isinstance(item, dict):
                label = str(item.get("label") or "").strip()
                value = str(item.get("value") or "").strip()
                if label and value:
                    body_lines.append(f"- {label}: {value}")
                elif label:
                    body_lines.append(f"- {label}")
            else:
                label = str(item).strip()
                if label:
                    body_lines.append(f"- {label}")

    body_lines.extend(
        [
            "",
            "If you believe this is a mistake, please contact your administrator.",
            "",
            "Best regards,",
            "SwiftBIM Team",
        ]
    )

    return _send_mail(email, subject, "\n".join(body_lines))