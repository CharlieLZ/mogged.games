import { isCloudflareWorker } from '@/shared/lib/env';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

type GoogleServiceAccountCredentials = {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();

export class GoogleServiceAccountConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleServiceAccountConfigError';
  }
}

function trimValue(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function expandHomePath(filePath: string) {
  if (!filePath.startsWith('~/')) {
    return filePath;
  }

  const homeDir = trimValue(process.env.HOME) || trimValue(process.env.USERPROFILE);

  if (!homeDir) {
    return filePath;
  }

  return `${homeDir}/${filePath.slice(2)}`;
}

function parseServiceAccountJson(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as {
      client_email?: string;
      private_key?: string;
      token_uri?: string;
    };
    const clientEmail = trimValue(parsed.client_email);
    const privateKey = trimValue(parsed.private_key);
    const tokenUri = trimValue(parsed.token_uri) || GOOGLE_OAUTH_TOKEN_URL;

    if (!clientEmail || !privateKey) {
      throw new GoogleServiceAccountConfigError(
        'GSC service account JSON 缺少 client_email 或 private_key'
      );
    }

    return {
      clientEmail,
      privateKey,
      tokenUri,
    } satisfies GoogleServiceAccountCredentials;
  } catch (error) {
    if (error instanceof GoogleServiceAccountConfigError) {
      throw error;
    }

    throw new GoogleServiceAccountConfigError(
      'GSC service account JSON 解析失败'
    );
  }
}

async function readServiceAccountFile(filePath: string) {
  const normalizedPath = expandHomePath(filePath);

  try {
    const fs = await import('node:fs/promises');
    return await fs.readFile(normalizedPath, 'utf8');
  } catch {
    throw new GoogleServiceAccountConfigError(
      `GSC service account 文件不可读取：${normalizedPath}`
    );
  }
}

export async function loadGoogleServiceAccountCredentials() {
  const inlineJson = trimValue(process.env.GSC_SERVICE_ACCOUNT_JSON);

  if (inlineJson) {
    return parseServiceAccountJson(inlineJson);
  }

  const fileConfig = trimValue(process.env.GSC_SERVICE_ACCOUNT_FILE);

  if (!fileConfig) {
    throw new GoogleServiceAccountConfigError(
      '缺少 GSC_SERVICE_ACCOUNT_JSON 或 GSC_SERVICE_ACCOUNT_FILE'
    );
  }

  if (fileConfig.startsWith('{')) {
    return parseServiceAccountJson(fileConfig);
  }

  if (isCloudflareWorker) {
    throw new GoogleServiceAccountConfigError(
      'Cloudflare Worker 线上环境不支持读取本地 service account 文件，请改用 GSC_SERVICE_ACCOUNT_JSON'
    );
  }

  return parseServiceAccountJson(await readServiceAccountFile(fileConfig));
}

function base64Encode(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes =
    typeof value === 'string' ? new TextEncoder().encode(value) : value;

  return base64Encode(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\s+/gu, '');

  if (typeof Buffer !== 'undefined') {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}

async function signJwt(payload: Record<string, unknown>, privateKeyPem: string) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function requestGoogleAccessToken(params: {
  credentials: GoogleServiceAccountCredentials;
  scopes: string[];
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    {
      iss: params.credentials.clientEmail,
      scope: params.scopes.join(' '),
      aud: params.credentials.tokenUri,
      exp: nowSeconds + 3600,
      iat: nowSeconds,
    },
    params.credentials.privateKey
  );

  const response = await fetch(params.credentials.tokenUri, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as TokenResponse;

  if (!response.ok || !trimValue(payload.access_token)) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Google OAuth access token 获取失败：${response.status}`
    );
  }

  return {
    accessToken: trimValue(payload.access_token),
    expiresAt:
      Date.now() +
      Math.max(0, (Number(payload.expires_in) || 3600) * 1000 - GOOGLE_TOKEN_EXPIRY_SKEW_MS),
  } satisfies CachedToken;
}

export async function getGoogleServiceAccountAccessToken(scopes: string[]) {
  const scopeKey = [...scopes].sort().join(' ');
  const cached = tokenCache.get(scopeKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const credentials = await loadGoogleServiceAccountCredentials();
  const token = await requestGoogleAccessToken({
    credentials,
    scopes,
  });

  tokenCache.set(scopeKey, token);
  return token.accessToken;
}
