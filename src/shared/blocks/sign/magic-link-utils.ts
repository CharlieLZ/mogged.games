const MAGIC_LINK_ERROR_TRANSLATION_KEY_BY_CODE: Record<string, string> = {
  INVALID_TOKEN: 'magic_link_error_invalid',
  EXPIRED_TOKEN: 'magic_link_error_expired',
  ATTEMPTS_EXCEEDED: 'magic_link_error_attempts_exceeded',
  FAILED_TO_CREATE_USER: 'magic_link_error_generic',
  FAILED_TO_CREATE_SESSION: 'magic_link_error_generic',
  NEW_USER_SIGNUP_DISABLED: 'magic_link_error_signup_disabled',
};

export function getMagicLinkErrorTranslationKey(errorCode?: string | null) {
  const normalizedErrorCode = errorCode?.trim().toUpperCase();

  if (!normalizedErrorCode) {
    return null;
  }

  return MAGIC_LINK_ERROR_TRANSLATION_KEY_BY_CODE[normalizedErrorCode] || null;
}
