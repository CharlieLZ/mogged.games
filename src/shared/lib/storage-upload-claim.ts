import { createHmac, timingSafeEqual } from 'node:crypto';

type UploadClaim = {
  uid: string;
  key: string;
  mime: string;
  size: number;
  fileName: string;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 15 * 60;

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required for upload verification');
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createUploadClaimToken(payload: {
  userId: string;
  key: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
  ttlSeconds?: number;
}) {
  const claim: UploadClaim = {
    uid: payload.userId,
    key: payload.key,
    mime: payload.mimeType,
    size: payload.fileSize,
    fileName: payload.fileName,
    exp:
      Math.floor(Date.now() / 1000) + (payload.ttlSeconds || DEFAULT_TTL_SECONDS),
  };

  const encoded = encodeBase64Url(JSON.stringify(claim));
  const signature = signValue(encoded);

  return {
    token: `${encoded}.${signature}`,
    claim,
  };
}

export function verifyUploadClaimToken(token: string) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signValue(encoded);
  const valid =
    signature.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!valid) {
    return null;
  }

  try {
    const claim = JSON.parse(decodeBase64Url(encoded)) as UploadClaim;
    if (!claim.exp || claim.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claim;
  } catch {
    return null;
  }
}
