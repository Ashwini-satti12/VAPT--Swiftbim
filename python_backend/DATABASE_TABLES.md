# Database Tables Used by Flask Backend (Same as PHP)

The Flask backend uses the **same MySQL database** (`swiftmanagement`) and the **same tables** as your PHP application. No new tables are required.

## Tables and columns used

| Table | Used in | Key columns |
|-------|--------|-------------|
| **employee** | auth, dashboard, employees, profile, auth_middleware, notifications, tasks, projects, teams, messages, calendar, timeline, etc. | id, email, password, full_name, user_role, Allpannel, Company_id, active, status, OTP, profile_picture, phone_number, dob, doj, department, address, salary, accountnumber, empid |
| **attendance** | auth (login) | employee_id, date, time_in, status, send, Company_id |
| **schedules** | auth (optional – PHP checks time_in for late) | Company_id, time_in |
| **projects** | projects, tasks, dashboard, notifications, calendar | id, project_name, uploaderid, members, department, due_date, priority, budget, modules, progress, Company_id |
| **tasks** | tasks, dashboard, notifications, timesheet | id, projectid, uploaderid, task_name, assigned_to, due_date, category, description, checklist, status, ticket, start_time, end_time, Pause, restart, Approval, ring, outputfilepath, document_attachment, Actual_start_time, modules_name, Company_id |
| **team** | teams, projects (filters), timesheet | team_id, leader, employee, project_lead, Company_id |
| **notifications** | notifications | id, user_id, project_id, title, message, type, is_read, created_at, Company_id |
| **messages** | messages | messages_id, incoming, outgoing, messages, date, sender_type, message_status, ring |
| **clientinformation** | clients | id, fullName, email, phoneNumber, address, GSTNumber, projectName, budget, startDate, endDate, totalHours, resourceInvolved, Company_id |
| **user_locations** | location | id, userid, latitude, longitude, timestamp, Company_id (created by API if missing) |
| **community** | community | id, user_id, date, text, employeeid, likes, emojis, type, ring, Company_id |
| **timeline** | timeline | id, emp_id, start_t, end_t, activity, participate_id, Company_id |
| **payment_milestones** | milestones | id, project_id, milestone_name, milestone_amount, due_date, notes, paid, Company_id |
| **tblleaves** | leave | id, empid, leave_type, description, Company_id, starttime, endtime, leave_lop, from_date, to_date, days_count, posting_date, status (0=pending, 1=approved, 2=declined) |
| **holiday** | leave (leave types) | id, title, leave_type, days_count, hours_per_duration, Company_id |

## Differences from a “generic” schema

- **Leave:** PHP uses **tblleaves** and **holiday** (not `leave_applications` / `leave_types`). Flask has been updated to use these same tables and column names.
- **Client:** PHP uses **clientinformation** with **fullName**, **phoneNumber**, and optional **GSTNumber**, **projectName**, **budget**, **startDate**, **endDate**, **totalHours**, **resourceInvolved**. Flask uses the same.

## Config

In `.env` (or config), point to the same database as PHP:

- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB=swiftmanagement`, `MYSQL_PORT`

No schema changes or new tables are required; both PHP and Flask can use the same database at the same time if needed.
