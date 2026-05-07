import { createHash, randomBytes } from 'node:crypto';

const API_KEY_PREFIX = 'sk-hh1-';
const API_KEY_VISIBLE_PREFIX_LENGTH = 12;

export function generateApiKeySecret() {
  return `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
}

export function hashApiKeySecret(secret: string) {
  return createHash('sha256').update(secret.trim()).digest('hex');
}

export function buildApiKeyPrefix(secret: string) {
  return secret.trim().slice(0, API_KEY_VISIBLE_PREFIX_LENGTH);
}

export function buildMaskedApiKeyDisplay(prefix?: string | null) {
  if (!prefix) {
    return '';
  }

  return `${prefix}...`;
}
