const PROVIDER_BRAND_PATTERN =
  /\b(?:volcengine|kie|apixo|apimart|evolink|fal|replicate)\b/gi;
const LEADING_PROVIDER_FAILURE_PATTERN =
  /^(?:volcengine|kie|apixo|apimart|evolink|fal|replicate)\s+(generate|query)\s+failed:\s*/i;

export function stripProviderBranding(raw?: string | null) {
  if (!raw) {
    return '';
  }

  let value = raw.trim();
  if (!value) {
    return '';
  }

  value = value.replace(LEADING_PROVIDER_FAILURE_PATTERN, '');
  value = value.replace(
    /^all\s+seedance\s+providers\s+failed(?:\s+for\s+[a-z-]+)?:\s*/i,
    'All providers failed: '
  );
  value = value.replace(PROVIDER_BRAND_PATTERN, 'provider');
  value = value.replace(/\bseedance\b/gi, 'generation');

  return value.replace(/\s{2,}/g, ' ').trim();
}
