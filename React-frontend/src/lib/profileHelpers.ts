import { appApiBase } from "./api";

const apiBase = appApiBase;

/**
 * Returns a globally accessible profile URL for an employee.
 *
 * If the profile starts with http/https, it is returned as is (e.g. dicebear, google avatar).
 * If no employee ID is provided, it falls back to the old uploads directory mapping.
 * Otherwise, it uses the new /api/view_profile_picture/:id endpoint to correctly
 * return the image through the backend (handling spaces, special chars, etc).
 */
export const getGlobalProfileUrl = (
  empId: number | string | undefined,
  profilePicture: string | null | undefined,
  userType?: string,
): string => {
  if (!profilePicture || profilePicture === "null" || profilePicture === "undefined") return "";

  const baseUrl = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;

  // If no employee ID is provided, we must use the direct upload path.
  if (!empId) {
    if (profilePicture.startsWith("http")) return profilePicture;
    const normalizedPath = profilePicture.replace(/\\/g, "/");
    // If it's just a filename, assume it's in the employee directory as per user request.
    if (!normalizedPath.includes("/")) {
      return `${baseUrl}/uploads/employee/${encodeURIComponent(normalizedPath)}`;
    }
    return `${baseUrl}/uploads/${normalizedPath}`;
  }

  // Use the API endpoint removing '/api' from apiBase if it already includes it
  const apiRoot = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
  let url = `${apiRoot}/api/view_profile_picture/${empId}`;

  const params = new URLSearchParams();
  if (userType) params.append("user_type", userType);

  if (profilePicture && typeof profilePicture === "string") {
    params.append("v", profilePicture);
  }

  const qs = params.toString();
  if (qs) url += `?${qs}`;

  return url;
};
