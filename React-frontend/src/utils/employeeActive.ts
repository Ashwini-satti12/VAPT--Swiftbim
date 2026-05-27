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

/** Shown after an account number is stored (never the real value). */
export const ACCOUNT_NUMBER_MASK = "***";

export function isAccountNumberMask(value?: string | null): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (v === ACCOUNT_NUMBER_MASK || v === "••••••••") return true;
  return /^[*•]{3,}$/.test(v);
}

export function accountNumberForDisplay(
  _accountnumber?: string | null,
  hasAccountNumber?: boolean
): string {
  if (hasAccountNumber) return ACCOUNT_NUMBER_MASK;
  return "Not provided";
}

/** Edit/add forms: show mask when a number is already on file. */
export function accountNumberForEdit(
  _accountnumber?: string | null,
  hasAccountNumber?: boolean
): string {
  if (hasAccountNumber) return ACCOUNT_NUMBER_MASK;
  return "";
}

export function accountNumberPlaceholder(hasAccountNumber?: boolean): string {
  if (hasAccountNumber) return "Enter new account number to update";
  return "Enter Account Number";
}

/** Clear mask when user focuses the field to type a new number. */
export function accountNumberOnFocus(
  current: string,
  hasStored?: boolean
): string {
  if (hasStored && isAccountNumberMask(current)) return "";
  return current;
}

/** Only submit when user entered a new account number (not empty / not mask). */
export function shouldSubmitAccountNumber(value?: string | null): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (isAccountNumberMask(v)) return false;
  return true;
}
