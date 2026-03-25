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
