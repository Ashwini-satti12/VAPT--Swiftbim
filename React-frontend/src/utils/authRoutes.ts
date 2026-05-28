/** Home route after login from user role and account type. */
export function homePathForUser(
  user: { user_role?: string | null; user_type?: string | null } | null | undefined,
): string {
  if (!user) return "/login";
  if (user.user_type === "client") return "/client/dashboard";

  const role = (user.user_role || "").trim();
  if (role === "Technical Director") return "/td/dashboard";
  if (role === "BIM Lead") return "/bl/dashboard";
  if (role === "BIM Coordinator") return "/bc/dashboard";
  if (role === "Vendor PM") return "/vpm/dashboard";
  if (role === "Vendor BIM Lead" || role === "Vendor Bim Lead") return "/vendor-bim-lead/dashboard";
  if (role === "Vendor Employee") return "/ve/dashboard";
  if (role === "Vendor" || role === "Vendor Admin") return "/v/dashboard";
  if (role === "BIM Modeler") return "/bm/dashboard";
  return "/dashboard";
}
