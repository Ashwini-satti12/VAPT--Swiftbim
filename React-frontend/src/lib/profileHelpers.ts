const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/';
// const apiBase = import.meta.env.VITE_API_BASE_URL || "https://projectmanagement.swifterz.ae/";

/**
 * Returns a globally accessible profile URL for an employee.
 * 
 * If the profile starts with http/https, it is returned as is (e.g. dicebear, google avatar).
 * If no employee ID is provided, it falls back to the old uploads directory mapping.
 * Otherwise, it uses the new /api/view_profile_picture/:id endpoint to correctly 
 * return the image through the backend (handling spaces, special chars, etc).
 */
export const getGlobalProfileUrl = (empId: number | string | undefined, profilePicture: string | null | undefined): string => {
    if (!profilePicture) return ''; // Reverts to placeholder in UI

    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
        return profilePicture;
    }

    if (!empId) {
        return `${apiBase}/uploads/${profilePicture}`;
    }

    // Use the new global endpoint removing '/api' from apiBase if it already includes it
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${baseUrl}/api/view_profile_picture/${empId}`;
};
