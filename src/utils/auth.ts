/**
 * Helper utilities for checking user roles, JWT expiration, session cleanup,
 * and global 401 handling from JWT token in localStorage.
 */
export const AUTH_EXPIRED_EVENT = 'atlas:auth-expired';

const SESSION_STORAGE_KEYS = [
  'atlas_selected_docente',
  'atlas_selected_cargo',
  'atlas_selected_licencia',
  'atlas_cargo_history',
  'atlas_listado_tab',
  'atlas_new_user_initial_role',
  'atlas_new_user_return_page',
  'atlas_alta_cargo_return_page',
  'atlas_redesignacion_data',
] as const;

export const getParsedToken = (rawToken?: string | null): any | null => {
  try {
    const token = rawToken !== undefined ? rawToken : localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const getTokenExpirationMs = (rawToken?: string | null): number | null => {
  const parsed = getParsedToken(rawToken);
  if (!parsed || typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) {
    return null;
  }
  return parsed.exp * 1000;
};

export const isTokenExpired = (rawToken?: string | null): boolean => {
  const expMs = getTokenExpirationMs(rawToken);
  if (expMs === null) return true;
  return Date.now() >= expMs;
};

export const clearSession = (): void => {
  localStorage.removeItem('token');
  SESSION_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
};

export const notifyUnauthorized = (): void => {
  clearSession();
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};

let isFetchInterceptorInstalled = false;

export const installAuthFetchInterceptor = (): void => {
  if (isFetchInterceptorInstalled || typeof window === 'undefined') return;
  isFetchInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const isPublicAuthEndpoint =
        url.includes('/api/auth/login') || url.includes('/api/auth/reset-password');
      const isBackendRequest = url.startsWith(apiUrl) || url.includes('/api/');

      if (isBackendRequest && !isPublicAuthEndpoint) {
        notifyUnauthorized();
      }
    }

    return response;
  };
};

export const getUserRole = (): string | null => {
  const parsed = getParsedToken();
  if (!parsed) return null;
  if (parsed.rol) return String(parsed.rol);
  if (parsed.role) return String(parsed.role);
  if (Array.isArray(parsed.roles) && parsed.roles.length > 0) return String(parsed.roles[0]);
  if (Array.isArray(parsed.authorities) && parsed.authorities.length > 0) {
    const auth = parsed.authorities[0];
    return typeof auth === 'string' ? auth : auth.authority;
  }
  return null;
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

export interface UserUnitInfo {
  unidadId: number | null;
  unidadNombre: string | null;
  tipoUnidadId: number | null;
  tipoUnidadNombre: string | null;
}

export const getUserUnitInfo = (): UserUnitInfo => {
  const parsed = getParsedToken();
  if (!parsed) {
    return { unidadId: null, unidadNombre: null, tipoUnidadId: null, tipoUnidadNombre: null };
  }
  const unidadId = parsed.unidadId ?? parsed.unidad_id ?? parsed.unitId ?? null;
  const unidadNombre = parsed.unidadNombre ?? parsed.unidad_nombre ?? null;
  const tipoUnidadId = parsed.tipoUnidadId ?? parsed.tipo_unidad_id ?? null;
  const tipoUnidadNombre = parsed.tipoUnidadNombre ?? parsed.tipo_unidad_nombre ?? null;

  return {
    unidadId: unidadId !== null ? Number(unidadId) : null,
    unidadNombre: unidadNombre ? String(unidadNombre) : null,
    tipoUnidadId: tipoUnidadId !== null ? Number(tipoUnidadId) : null,
    tipoUnidadNombre: tipoUnidadNombre ? String(tipoUnidadNombre) : null,
  };
};
