import html2pdf from 'html2pdf.js';

export interface BackendArchivo {
  archivoId?: number;
  nombreOriginal?: string;
  nombreEncriptado?: string;
  tipoContenido?: string;
  fechaSubida?: string;
}

/**
 * Genera un Blob PDF a partir del elemento HTML de la hoja A4 usando html2pdf.js.
 */
export async function generatePdfBlobFromElement(
  element: HTMLElement,
  filename: string
): Promise<Blob> {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.minHeight = '1122px';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.zoom = '100%';

  const options = {
    margin: 0,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, width: 794, windowWidth: 794 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  };

  const blob: Blob = await html2pdf().set(options).from(clone).outputPdf('blob');
  return blob;
}

/**
 * Genera el PDF en el frontend a partir de `element` y lo sube al backend
 * mediante POST /api/archivos/subir.
 */
export async function generateAndUploadDesignacionPdf(params: {
  element: HTMLElement | null;
  filename: string;
  designacionId: number;
  apiUrl: string;
  token: string | null;
}): Promise<BackendArchivo | null> {
  const { element, filename, designacionId, apiUrl, token } = params;
  if (!element || !designacionId) return null;

  try {
    const pdfBlob = await generatePdfBlobFromElement(element, filename);
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('tipoTramite', 'DESIGNACION');
    formData.append('tramiteId', String(designacionId));

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${apiUrl}/api/archivos/subir`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as BackendArchivo | null;
  } catch {
    return null;
  }
}

/**
 * Intenta descargar el PDF oficial guardado en el backend.
 * Retorna true si logró descargarlo, o false para permitir fallback a la vista HTML.
 */
export async function tryDownloadBackendPdf(params: {
  apiUrl: string;
  token: string | null;
  doc: {
    name?: string;
    url?: string;
    nombreEncriptado?: string;
    designacionId?: number;
  };
}): Promise<boolean> {
  const { apiUrl, token, doc } = params;
  const resolvedToken = token || localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (resolvedToken) {
    headers['Authorization'] = `Bearer ${resolvedToken}`;
  }

  try {
    let downloadUrl: string | null = null;
    let downloadFilename = doc.name || 'Acta_Designacion.pdf';

    if (doc.nombreEncriptado) {
      downloadUrl = `${apiUrl}/api/archivos/descargar/${encodeURIComponent(doc.nombreEncriptado)}`;
    } else if (doc.url && doc.url.startsWith('/api/archivos/descargar/')) {
      downloadUrl = `${apiUrl}${doc.url}`;
    } else {
      const tramiteUrl =
        doc.url && doc.url.startsWith('/api/archivos/tramite/')
          ? `${apiUrl}${doc.url}`
          : doc.designacionId
            ? `${apiUrl}/api/archivos/tramite/DESIGNACION/${doc.designacionId}`
            : null;

      if (tramiteUrl) {
        const listRes = await fetch(tramiteUrl, { headers });
        if (listRes.ok) {
          const archivos: BackendArchivo[] = await listRes.json().catch(() => []);
          if (Array.isArray(archivos) && archivos.length > 0) {
            const latest = archivos[archivos.length - 1];
            if (latest.nombreEncriptado) {
              downloadUrl = `${apiUrl}/api/archivos/descargar/${encodeURIComponent(latest.nombreEncriptado)}`;
            }
            if (latest.nombreOriginal) {
              downloadFilename = latest.nombreOriginal;
            }
          }
        }
      }
    }

    if (!downloadUrl) {
      console.warn('[designacionPdf] No downloadUrl found for doc:', doc);
      return false;
    }

    const fileRes = await fetch(downloadUrl, { headers });
    if (!fileRes.ok) {
      console.warn(`[designacionPdf] Backend download failed (${fileRes.status}) for ${downloadUrl}`);
      return false;
    }

    const blob = await fileRes.blob();
    if (!blob || blob.size === 0) return false;

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = downloadFilename.endsWith('.pdf') ? downloadFilename : `${downloadFilename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return true;
  } catch {
    return false;
  }
}
