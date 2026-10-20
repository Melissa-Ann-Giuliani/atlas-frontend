/**
 * Helper utilities for checking user roles from JWT token in localStorage.
 */
export const getUserRole = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed.rol) return String(parsed.rol);
    if (parsed.role) return String(parsed.role);
    if (Array.isArray(parsed.roles) && parsed.roles.length > 0) return String(parsed.roles[0]);
    if (Array.isArray(parsed.authorities) && parsed.authorities.length > 0) {
      const auth = parsed.authorities[0];
      return typeof auth === 'string' ? auth : auth.authority;
    }
    return null;
  } catch {
    return null;
  }
};

export const isGlobalAdmin = (): boolean => {
  const role = getUserRole();
  if (!role) return false;
  const upper = role.toUpperCase().trim();
  return (
    upper === 'ADMIN_GLOBAL' ||
    upper === 'ROLE_ADMIN_GLOBAL' ||
    upper === 'ADMIN GLOBAL' ||
    upper === 'ADMINISTRADOR GLOBAL' ||
    upper === 'ROLE_ADMINISTRADOR_GLOBAL'
  );
};
