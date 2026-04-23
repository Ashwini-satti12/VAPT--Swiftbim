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
  if (!profilePicture) return ""; // Reverts to placeholder in UI

  if (
    profilePicture.startsWith("http://") ||
    profilePicture.startsWith("https://")
  ) {
    return profilePicture;
  }

  if (!empId) {
    return `${apiBase}/uploads/${profilePicture}`;
  }

  // Use the new global endpoint removing '/api' from apiBase if it already includes it
  const baseUrl = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
  let url = `${baseUrl}/api/view_profile_picture/${empId}`;

  const params = new URLSearchParams();
  if (userType) params.append("user_type", userType);

  // Add a cache-buster query param using the filename itself if available
  // This ensures that when the filename changes (e.g. includes a timestamp),
  // the browser sees a new URL and reloads the image.
  if (profilePicture && typeof profilePicture === "string") {
    params.append("v", profilePicture);
  }

  const qs = params.toString();
  if (qs) url += `?${qs}`;

  return url;
};
