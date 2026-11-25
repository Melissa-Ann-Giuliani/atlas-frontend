export type ExportFormat = 'pdf' | 'xlsx';

export type ExportQueryParams =
  | URLSearchParams
  | Record<string, string | number | boolean | null | undefined>;

export interface ExportFileOptions {
  endpoint: string;
  format: ExportFormat;
  params?: ExportQueryParams;
  fallbackFilename: string;
  onUnauthorized?: () => void;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const PAGINATION_PARAM_KEYS = new Set(['page', 'size']);

/**
 * Extracts a filename from a Content-Disposition header, supporting both
 * RFC 5987 (`filename*=UTF-8''...`) and standard (`filename="..."`) forms.
 */
export const extractFilenameFromHeader = (
  contentDisposition: string | null,
  fallbackFilename: string
): string => {
  if (!contentDisposition) return fallbackFilename;

  // Prefer RFC 5987 filename* when present
  const utf8Match = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;\r\n]+)/i);
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
      const sanitized = decoded.replace(/[/\\]/g, '_').trim();
      if (sanitized) return sanitized;
    } catch {
      // Fall through to standard filename parsing
    }
  }

  // Standard filename="..." or filename=...
  const standardMatch = contentDisposition.match(/filename\s*=\s*("([^"]+)"|([^;\r\n]+))/i);
  const rawName = standardMatch?.[2] ?? standardMatch?.[3];
  if (rawName) {
    const sanitized = rawName.trim().replace(/^["']|["']$/g, '').replace(/[/\\]/g, '_').trim();
    if (sanitized) return sanitized;
  }

  return fallbackFilename;
};

const buildExportSearchParams = (
  format: ExportFormat,
  params?: ExportQueryParams
): URLSearchParams => {
  const searchParams = new URLSearchParams();
  searchParams.set('formato', format);

  if (!params) return searchParams;

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => {
      if (PAGINATION_PARAM_KEYS.has(key) || key === 'formato') return;
      if (value !== '') {
        searchParams.append(key, value);
      }
    });
    return searchParams;
  }

  Object.entries(params).forEach(([key, value]) => {
    if (PAGINATION_PARAM_KEYS.has(key) || key === 'formato') return;
    if (value === undefined || value === null) return;
    const strValue = String(value).trim();
    if (strValue !== '') {
      searchParams.append(key, strValue);
    }
  });

  return searchParams;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  if (response.status === 401) {
    return 'Tu sesión expiró. Por favor, iniciá sesión nuevamente.';
  }
  if (response.status === 403) {
    return 'No tenés permisos para exportar este listado.';
  }

  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errBody = await response.json();
      const detail = errBody?.message || errBody?.error || errBody?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
    } else {
      const text = await response.text();
      if (text && text.trim().length > 0 && text.trim().length < 240 && !text.trim().startsWith('<')) {
        return text.trim();
      }
    }
  } catch {
    // Ignore parsing error and use default message below
  }

  if (response.status === 400) {
    return 'Los filtros seleccionados no son válidos para exportar.';
  }
  return `No se pudo generar el archivo de exportación (error ${response.status}).`;
};

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
};

/**
 * Downloads a binary PDF or Excel (.xlsx) export from an authenticated backend endpoint.
 */
export const exportFile = async ({
  endpoint,
  format,
  params,
  fallbackFilename,
  onUnauthorized,
}: ExportFileOptions): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    Accept: MIME_TYPES[format],
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const searchParams = buildExportSearchParams(format, params);
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${apiUrl}${normalizedEndpoint}?${searchParams.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor para exportar el archivo.');
  }

  if (response.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error('Tu sesión expiró. Por favor, iniciá sesión nuevamente.');
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const rawBlob = await response.blob();
  const blob =
    rawBlob.type && rawBlob.type !== 'application/octet-stream'
      ? rawBlob
      : new Blob([rawBlob], { type: MIME_TYPES[format] });

  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = extractFilenameFromHeader(contentDisposition, fallbackFilename);

  triggerBrowserDownload(blob, filename);
};
