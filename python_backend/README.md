# Swifterz Flask Backend

Converted from the PHP backend. All API endpoints are implemented as Flask blueprints.

## Setup

```bash
cd flask_backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MySQL credentials (same DB as PHP: swiftmanagement)
```

## Run

```bash
python app.py
```

API base: `http://localhost:5000`

## Auth

- **Login:** `POST /api/auth/login` with `{"email": "...", "password": "..."}`. Returns `token` and `user`. Use the token in header: `Authorization: Bearer <token>`.
- **Me (panels + role):** `GET /api/auth/me` with Bearer token. Returns `user` with `panels`, `user_role`, `is_super_admin` for frontend menu/visibility.
- **Logout:** `POST /api/auth/logout` (with Bearer token).
- **Forgot password:** `POST /api/auth/forgot-password` → **Verify OTP:** `POST /api/auth/verify-otp` → **Reset:** `POST /api/auth/reset-password` with `reset_token` and passwords.

## Role & panel-based access (same as PHP)

- **Panel access (Allpannel):** Project app APIs require the user to have **Employee** or **All** in `Allpannel` (same as PHP `project/index.php` and sidebar). Users without that get `403 Access denied`.
- **Super admin:** User with `id == 1` bypasses panel/role checks (full access).
- **Clients:** **BIM Lead** and **BIM Coordinator** cannot access any `/api/clients/*` routes (matches PHP sidebar: no Clients link for those roles).
- **Employees create/update:** Role hierarchy is enforced: Project Manager cannot assign BIM Lead/Technical Director/CEO/CTO; BIM Lead cannot assign Project Manager/Technical Director/CEO/CTO; BIM Coordinator cannot assign BIM Lead or above; Technical Director has no restrictions.

## API Routes Summary

| Prefix | Blueprint | Endpoints |
|--------|-----------|-----------|
| `/api/auth` | auth | login, logout, forgot-password, verify-otp, reset-password, admin/reset-password |
| `/api/dashboard` | dashboard | stats (GET) |
| `/api/notifications` | notifications | GET list, POST \<id\>/read, POST read-all, GET tasks, POST tasks/\<task_id\>/read |
| `/api/tasks` | tasks | GET list, POST create, GET/PUT/DELETE \<id\>, PATCH \<id\>/status, POST \<id\>/output-files |
| `/api/projects` | projects | GET list, GET/POST/PUT \<id\>, POST filters/leaders, filters/members, filters/modules |
| `/api/employees` | employees | GET list, POST create, GET/PUT \<id\>, PATCH \<id\>/status, POST invite, POST bulk-status, GET members, GET availability |
| `/api/clients` | clients | GET list, POST create, GET/PUT \<id\>, GET dashboard-stats |
| `/api/messages` | messages | GET list, POST \<id\>/read |
| `/api/location` | location | POST save, GET employees |
| `/api/timesheet` | timesheet | POST completed-tasks |
| `/api/leave` | leave | GET types, GET/POST applications, POST applications/\<id\>/approve, reject |
| `/api/community` | community | GET posts, POST posts/\<id\>/react, POST ring |
| `/api/profile` | profile | GET, PUT, POST change-password |
| `/api/company` | company | POST switch |
| `/api/teams` | teams | GET list, POST create, GET/PUT \<id\> |
| `/api/milestones` | milestones | GET list, POST create, GET/PUT/DELETE \<id\>, POST \<id\>/mark-paid |
| `/api/calendar` | calendar | GET events |
| `/api/timeline` | timeline | GET list, POST create, PUT \<id\> |
| `/api/reports` | reports | POST generate, GET payment-receipt/\<id\> |

See **BACKEND_API_FLASK_CONVERSION.md** in the project root for the full PHP-to-Flask mapping.

## Database

Uses the same MySQL database as the PHP app (`swiftmanagement`). Ensure tables exist: `employee`, `attendance`, `projects`, `tasks`, `team`, `notifications`, `messages`, `clientinformation`, `user_locations`, `community`, `timeline`, `payment_milestones`, `leave_types`, `leave_applications`, etc. If your PHP schema uses different table/column names, adjust the SQL in the blueprints accordingly.
