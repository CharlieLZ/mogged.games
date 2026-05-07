export type ReferenceMediaKind = 'image' | 'video' | 'audio';

export type ReferenceMediaUrlIssue =
  | 'invalid'
  | 'unsupported_protocol'
  | 'cloud_drive_or_social'
  | 'private_host'
  | 'wrong_media_type'
  | 'non_media_attachment';

export interface ReferenceMediaUrlListIssue {
  code: ReferenceMediaUrlIssue | 'too_many';
  maxCount?: number;
}

export interface ReferenceMediaUrlListValidation {
  items: string[];
  issue: ReferenceMediaUrlListIssue | null;
}

const MEDIA_EXTENSIONS = {
  image: new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.bmp']),
  video: new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v']),
  audio: new Set(['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac']),
} satisfies Record<ReferenceMediaKind, Set<string>>;

const CLOUD_DRIVE_HOSTS = new Set([
  'box.com',
  'drive.google.com',
  'dropbox.com',
  'docs.google.com',
  'icloud.com',
  'mega.nz',
  'onedrive.live.com',
  'photos.google.com',
  '1drv.ms',
]);

const SOCIAL_SHARE_HOSTS = new Set([
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'linkedin.com',
  'reddit.com',
  'tiktok.com',
  'vimeo.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
]);

function stripWww(hostname: string) {
  return hostname.replace(/^www\./, '');
}

function normalizeHost(hostname: string) {
  return stripWww(hostname.toLowerCase()).replace(/^\[(.*)\]$/, '$1');
}

function getPathExtension(pathname: string) {
  const normalizedPath = pathname.toLowerCase();
  const lastDot = normalizedPath.lastIndexOf('.');
  if (lastDot < 0) {
    return '';
  }

  return normalizedPath.slice(lastDot);
}

export function getReferenceMediaUrlExtension(raw: string | null | undefined) {
  if (!raw) {
    return '';
  }

  try {
    return getPathExtension(new URL(raw.trim()).pathname);
  } catch {
    return '';
  }
}

export function isTrustedAssetReferenceMediaUrl(
  raw: string | null | undefined
) {
  if (!raw) {
    return false;
  }

  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'asset:' && Boolean(parsed.host || parsed.pathname);
  } catch {
    return false;
  }
}

export function isStorageBackedReferenceMediaUrl(
  raw: string | null | undefined
) {
  if (!raw) {
    return false;
  }

  try {
    const parsed = new URL(raw.trim());
    return parsed.pathname.toLowerCase().includes('/api/storage/file');
  } catch {
    return false;
  }
}

export async function sniffStorageBackedReferenceMediaContentType(
  raw: string,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(raw, {
    method: 'GET',
    headers: {
      Range: 'bytes=0-0',
    },
  });

  if (!response.ok && response.status !== 206) {
    throw new Error(
      `failed to inspect storage-backed media url: ${response.status}`
    );
  }

  return response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || null;
}

function isIpv4Host(host: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isPrivateIpv4(host: string) {
  if (!isIpv4Host(host)) {
    return false;
  }

  const parts = host.split('.').map(Number);
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(host: string) {
  const normalized = host.toLowerCase();

  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isPrivateHostname(host: string) {
  return (
    host === 'localhost' ||
    host === 'host.docker.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan')
  );
}

function isPrivateHost(hostname: string) {
  const normalized = normalizeHost(hostname);

  return (
    isPrivateHostname(normalized) ||
    isPrivateIpv4(normalized) ||
    isPrivateIpv6(normalized)
  );
}

function getOtherKindExtensions(kind: ReferenceMediaKind) {
  return Object.entries(MEDIA_EXTENSIONS)
    .filter(([entryKind]) => entryKind !== kind)
    .flatMap(([, extensions]) => Array.from(extensions));
}

export function parseReferenceMediaUrlList(value: string) {
  const seen = new Set<string>();

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });
}

export function appendReferenceMediaUrl(list: string, url: string) {
  const items = parseReferenceMediaUrlList(list);
  if (!items.includes(url)) {
    items.push(url);
  }

  return items.join('\n');
}

export function getReferenceMediaUrlIssue(
  raw: string | null | undefined,
  kind: ReferenceMediaKind
): ReferenceMediaUrlIssue | null {
  if (!raw) {
    return null;
  }

  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (kind === 'image' && value.startsWith('data:image/')) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'invalid';
  }

  if (parsed.protocol === 'asset:') {
    return isTrustedAssetReferenceMediaUrl(value) ? null : 'invalid';
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'unsupported_protocol';
  }

  const host = normalizeHost(parsed.hostname);
  const pathname = parsed.pathname.toLowerCase();

  if (pathname.includes('/api/storage/file')) {
    return null;
  }

  if (isPrivateHost(host)) {
    return 'private_host';
  }

  if (CLOUD_DRIVE_HOSTS.has(host) || SOCIAL_SHARE_HOSTS.has(host)) {
    return 'cloud_drive_or_social';
  }

  const extension = getPathExtension(pathname);
  if (!extension) {
    return null;
  }

  if (MEDIA_EXTENSIONS[kind].has(extension)) {
    return null;
  }

  if (getOtherKindExtensions(kind).includes(extension)) {
    return 'wrong_media_type';
  }

  return 'non_media_attachment';
}

export function validateReferenceMediaUrlList(
  value: string,
  kind: ReferenceMediaKind,
  maxCount: number
): ReferenceMediaUrlListValidation {
  const items = parseReferenceMediaUrlList(value);

  for (const item of items) {
    const issue = getReferenceMediaUrlIssue(item, kind);
    if (issue) {
      return {
        items,
        issue: { code: issue },
      };
    }
  }

  if (items.length > maxCount) {
    return {
      items,
      issue: {
        code: 'too_many',
        maxCount,
      },
    };
  }

  return {
    items,
    issue: null,
  };
}

export function getReferenceMediaUrlErrorMessage(
  issue: ReferenceMediaUrlIssue,
  kind: ReferenceMediaKind
): string {
  const article = kind === 'video' ? 'a' : 'an';

  switch (issue) {
    case 'invalid':
    case 'unsupported_protocol':
      return `${kind}_url must be a valid public http(s) ${kind} URL.`;
    case 'cloud_drive_or_social':
      return `${kind}_url must be a direct public ${kind} file, not a cloud-drive or social share link.`;
    case 'private_host':
      return `${kind}_url must be publicly reachable. Private, localhost, and LAN URLs are not supported.`;
    case 'wrong_media_type':
      return `${kind}_url must point to ${article} ${kind} file.`;
    case 'non_media_attachment':
      return `${kind}_url must point to a direct ${kind} file, not a generic attachment or download page.`;
  }
}
