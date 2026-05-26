import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from flask import current_app


def _send_mail(to_email, subject, body, html_body=None):
    """Send email with headers aligned to the authenticated Gmail account (reduces spam)."""
    mail_server = current_app.config.get("MAIL_SERVER") or ""
    mail_port = int(current_app.config.get("MAIL_PORT") or 587)
    mail_use_tls = bool(current_app.config.get("MAIL_USE_TLS"))
    mail_username = (current_app.config.get("MAIL_USERNAME") or "").strip()
    mail_password = (current_app.config.get("MAIL_PASSWORD") or "").replace(" ", "")
    from_name = (current_app.config.get("MAIL_FROM_NAME") or "SwiftBIM").strip()

    if not (mail_server and mail_username):
        current_app.logger.warning("Email NOT sent: SMTP not configured.")
        return False

    to_email = (to_email or "").strip()
    if not to_email:
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, mail_username))
    msg["To"] = to_email
    msg["Reply-To"] = mail_username
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(mail_server, mail_port, timeout=15) as server:
            if mail_use_tls:
                server.starttls(context=context)
            if mail_password:
                server.login(mail_username, mail_password)
            server.send_message(msg, from_addr=mail_username, to_addrs=[to_email])
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_welcome_email(email, full_name, user_role, password=None):
    """Send a welcome email when a consultant/employee is added."""
    to_email = (email or "").strip()
    login_url = (current_app.config.get("APP_LOGIN_URL") or "http://localhost:5173/login").strip()
    role_label = user_role or "team member"
    name = full_name or "there"

    subject = f"SwiftBIM account created — {name}"

    body_lines = [
        f"Hello {name},",
        "",
        f"Your SwiftBIM account has been created as {role_label}.",
        "",
        f"Sign in here: {login_url}",
        f"Email: {to_email}",
    ]
    if password:
        body_lines.append(f"Temporary password: {password}")
        body_lines.append("")
        body_lines.append("Please change your password after your first login.")
    body_lines.extend(
        [
            "",
            "If you did not expect this message, contact your administrator.",
            "",
            "Regards,",
            "SwiftBIM Team",
        ]
    )
    body = "\n".join(body_lines)

    pwd_block = (
        f"<p><strong>Temporary password:</strong> {password}</p>"
        "<p><em>Please change your password after your first login.</em></p>"
        if password
        else ""
    )
    html = f"""<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
<p>Hello {name},</p>
<p>Your <strong>SwiftBIM</strong> account has been created as <strong>{role_label}</strong>.</p>
<p><a href="{login_url}">Sign in to SwiftBIM</a></p>
<ul>
  <li><strong>Email:</strong> {to_email}</li>
</ul>
{pwd_block}
<p>If you did not expect this message, contact your administrator.</p>
<p>Regards,<br>SwiftBIM Team</p>
</body></html>"""

    return _send_mail(to_email, subject, body, html_body=html)

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