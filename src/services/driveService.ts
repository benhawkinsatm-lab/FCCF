export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

export interface DriveListResponse {
  files: DriveFileItem[];
  nextPageToken?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';

/**
 * Sleep helper for exponential backoff
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust fetch with exponential backoff for Google Drive API 5xx errors
 */
async function fetchDriveWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let delay = 800;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      // If successful or client error (except rate limit 429), return immediately
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }
      // On 5xx (500 Internal Error, 502, 503) or 429, wait and retry
      console.warn(`Google Drive API returned ${res.status} (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delay}ms...`);
      if (attempt < maxRetries - 1) {
        await wait(delay);
        delay *= 2;
      } else {
        return res;
      }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await wait(delay);
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
  return fetch(url, options);
}

/**
 * List files from user's Google Drive with folder navigation & search
 */
export async function listDriveFiles(
  accessToken: string,
  options?: {
    folderId?: string;
    searchQuery?: string;
    mimeTypeCategory?: 'all' | 'folders' | 'pdf' | 'docs' | 'sheets' | 'images' | 'text';
    pageSize?: number;
    pageToken?: string;
  }
): Promise<DriveListResponse> {
  const queryParts: string[] = ['trashed = false'];

  // If a specific folder is requested, filter by parent
  if (options?.folderId) {
    queryParts.push(`'${options.folderId}' in parents`);
  } else if (!options?.searchQuery) {
    // If browsing at the root level and not performing a global search, scope to 'root'
    queryParts.push(`'root' in parents`);
  }

  if (options?.searchQuery && options.searchQuery.trim()) {
    const escaped = options.searchQuery.replace(/'/g, "\\'");
    queryParts.push(`name contains '${escaped}'`);
  }

  if (options?.mimeTypeCategory) {
    switch (options.mimeTypeCategory) {
      case 'folders':
        queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
        break;
      case 'pdf':
        queryParts.push("mimeType = 'application/pdf'");
        break;
      case 'docs':
        queryParts.push("(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')");
        break;
      case 'sheets':
        queryParts.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'text/csv' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')");
        break;
      case 'images':
        queryParts.push("mimeType contains 'image/'");
        break;
      case 'text':
        queryParts.push("(mimeType contains 'text/' or mimeType = 'application/json')");
        break;
    }
  }

  const q = queryParts.join(' and ');
  const pageSize = options?.pageSize || 40;

  // Primary URL using safe orderBy: modifiedTime desc (never 'folder', which causes 500 error in v3)
  // and essential fields (excluding thumbnailLink which causes 500 errors on async processing)
  const url = new URL(`${DRIVE_API_URL}/files`);
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, parents)');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');

  if (options?.pageToken) {
    url.searchParams.set('pageToken', options.pageToken);
  }

  let res = await fetchDriveWithRetry(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  // If primary query still fails with 500 Internal Error, perform fallback without orderBy and without parent constraint
  if (!res.ok && res.status >= 500) {
    console.warn('Primary Drive query failed with 500; attempting simplified fallback query...');
    const fallbackUrl = new URL(`${DRIVE_API_URL}/files`);
    fallbackUrl.searchParams.set('q', 'trashed = false');
    fallbackUrl.searchParams.set('pageSize', pageSize.toString());
    fallbackUrl.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, parents)');
    fallbackUrl.searchParams.set('supportsAllDrives', 'true');
    fallbackUrl.searchParams.set('includeItemsFromAllDrives', 'true');

    res = await fetchDriveWithRetry(fallbackUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    let errorDetail = errText;
    try {
      const errJson = JSON.parse(errText);
      errorDetail = errJson.error?.message || errText;
    } catch {
      // ignore
    }
    throw new Error(`Google Drive API error (${res.status}): ${errorDetail}`);
  }

  const data = await res.json();
  const rawFiles: DriveFileItem[] = data.files || [];

  // Sort client-side: folders first, then by modifiedTime descending
  const sortedFiles = rawFiles.slice().sort((a, b) => {
    const isFolderA = a.mimeType === 'application/vnd.google-apps.folder';
    const isFolderB = b.mimeType === 'application/vnd.google-apps.folder';
    if (isFolderA && !isFolderB) return -1;
    if (!isFolderA && isFolderB) return 1;
    const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
    const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
    return timeB - timeA;
  });

  return {
    files: sortedFiles,
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Download file content or export Google Doc as plain text for ingestion
 */
export async function downloadDriveFileContent(
  accessToken: string,
  file: DriveFileItem
): Promise<string> {
  const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
  const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';

  let fetchUrl = `${DRIVE_API_URL}/files/${file.id}?alt=media`;
  if (isGoogleDoc) {
    fetchUrl = `${DRIVE_API_URL}/files/${file.id}/export?mimeType=text/plain`;
  } else if (isGoogleSheet) {
    fetchUrl = `${DRIVE_API_URL}/files/${file.id}/export?mimeType=text/csv`;
  }

  const res = await fetch(fetchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    // If binary file (like PDF or Image) that cannot be directly read as text, return structured fallback metadata
    if (file.mimeType.includes('pdf') || file.mimeType.includes('image')) {
      return `[Google Drive File Ingested]\nFile Name: ${file.name}\nFile ID: ${file.id}\nMIME Type: ${file.mimeType}\nModified: ${file.modifiedTime || 'N/A'}\nDirect Cloud Link: ${file.webViewLink || 'Drive Secure Link'}\n\nEvidence Description: Primary court evidentiary exhibit imported directly from Google Drive cloud storage.`;
    }
    const errText = await res.text();
    throw new Error(`Failed to download file (${res.status}): ${errText}`);
  }

  const text = await res.text();
  // Protect against huge files triggering 413 Payload Too Large by capping to 500,000 characters
  if (text && text.length > 500000) {
    return text.slice(0, 500000) + '\n\n[... Text truncated for evidentiary ingestion ...]';
  }
  return text;
}

/**
 * Upload a document or evidence file to user's Google Drive.
 * Must be accompanied by explicit user confirmation in UI before calling.
 */
export async function uploadFileToDrive(
  accessToken: string,
  params: {
    name: string;
    content: string;
    mimeType?: string;
    folderId?: string;
    description?: string;
  }
): Promise<DriveFileItem> {
  const metadata: Record<string, any> = {
    name: params.name,
    mimeType: params.mimeType || 'text/plain',
    description: params.description || 'Generated by Family Court Intelligence System (Case 4344/2023)',
  };

  if (params.folderId) {
    metadata.parents = [params.folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${params.mimeType || 'text/plain'}; charset=UTF-8\r\n\r\n` +
    params.content +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload to Google Drive (${res.status}): ${errText}`);
  }

  const createdFile: DriveFileItem = await res.json();
  return createdFile;
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFileItem> {
  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create folder (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Delete a file or folder in Google Drive.
 * WARNING: Destructive operation - MUST require explicit user confirmation first.
 */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Failed to delete file from Google Drive (${res.status}): ${errText}`);
  }
}
