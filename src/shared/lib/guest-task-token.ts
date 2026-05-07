import { createHmac, timingSafeEqual } from 'node:crypto';

const GUEST_TASK_TOKEN_VERSION = 1;
const GUEST_TASK_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type GuestTaskTokenPayload = {
  exp: number;
  guestIdHash: string;
  taskId: string;
  v: number;
};

function getGuestTaskTokenSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is required for guest task token signing');
  }

  return secret;
}

function signGuestTaskValue(value: string) {
  return createHmac('sha256', getGuestTaskTokenSecret())
    .update(value)
    .digest('base64url');
}

function encodeGuestTaskPayload(payload: GuestTaskTokenPayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeGuestTaskPayload(value: string) {
  return JSON.parse(
    Buffer.from(value, 'base64url').toString('utf8')
  ) as GuestTaskTokenPayload;
}

export function createGuestTaskToken({
  guestIdHash,
  taskId,
}: Omit<GuestTaskTokenPayload, 'exp' | 'v'>) {
  const encoded = encodeGuestTaskPayload({
    exp: Math.floor(Date.now() / 1000) + GUEST_TASK_TOKEN_TTL_SECONDS,
    guestIdHash,
    taskId,
    v: GUEST_TASK_TOKEN_VERSION,
  });

  return `${encoded}.${signGuestTaskValue(encoded)}`;
}

export function verifyGuestTaskToken({
  guestIdHash,
  taskId,
  token,
}: {
  guestIdHash: string;
  taskId?: string | null;
  token?: string | null;
}) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signGuestTaskValue(encoded);
  const valid =
    signature.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!valid) {
    return null;
  }

  try {
    const payload = decodeGuestTaskPayload(encoded);
    if (
      payload.v !== GUEST_TASK_TOKEN_VERSION ||
      payload.exp < Math.floor(Date.now() / 1000) ||
      payload.guestIdHash !== guestIdHash ||
      !payload.taskId ||
      (taskId && payload.taskId !== taskId)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
