/**
 * Employee rows from `/api/employees` include `active` (DB: employee.active — e.g. "active" | "deactive").
 * Vendor rows map `status` into `active`. Use this only for assignment dropdowns, not for displaying
 * people already stored on a project.
 */
const INACTIVE_ACTIVE_VALUES = new Set([
  "deactive",
  "inactive",
  "disabled",
  "0",
  "false",
  "no",
]);

export function isEmployeeActiveForProjectAssignment(emp: {
  active?: string | null;
}): boolean {
  const v = String(emp?.active ?? "").trim().toLowerCase();
  if (v === "") return true;
  return !INACTIVE_ACTIVE_VALUES.has(v);
}

export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordStrengthErrors(password: string): string[] {
  const pwd = password || "";
  const errors: string[] = [];
  if (pwd.length < PASSWORD_MIN_LENGTH) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(pwd)) errors.push("one uppercase letter");
  if (!/[a-z]/.test(pwd)) errors.push("one lowercase letter");
  if (!/\d/.test(pwd)) errors.push("one number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) {
    errors.push("one special character");
  }
  return errors;
}

export function getPasswordStrengthMessage(password: string): string | null {
  const errors = getPasswordStrengthErrors(password);
  if (!errors.length) return null;
  return `Password must include ${errors.join(", ")}`;
}

export function isStrongPassword(password: string): boolean {
  return getPasswordStrengthErrors(password).length === 0;
}
