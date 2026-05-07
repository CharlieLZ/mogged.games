const MAILTO_PATTERN = /^mailto:/i;
const EXTERNAL_HREF_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;
const MAILTO_ANCHOR_PATTERN =
  /^([\s\S]*?)<a\b[^>]*href=(["'])(mailto:[^"'#? >]+(?:\?[^"']*)?)\2[^>]*>([\s\S]*?)<\/a>([\s\S]*)$/i;

export function isMailtoHref(href?: string | null) {
  return Boolean(href && MAILTO_PATTERN.test(href));
}

export function isExternalHref(href?: string | null) {
  return Boolean(href && EXTERNAL_HREF_PATTERN.test(href));
}

export function getEmailFromMailto(href?: string | null) {
  if (!isMailtoHref(href)) {
    return '';
  }

  return href!.replace(MAILTO_PATTERN, '').split('?')[0]?.trim() || '';
}

export function parseInlineMailtoAnchor(input?: string | null) {
  if (!input) {
    return null;
  }

  const match = input.match(MAILTO_ANCHOR_PATTERN);
  if (!match) {
    return null;
  }

  const before = match[1] || '';
  const href = match[3] || '';
  const label = match[4] || '';
  const after = match[5] || '';
  const email = getEmailFromMailto(href);

  if (!email) {
    return null;
  }

  return {
    before,
    href,
    email,
    label: label || email,
    after,
  };
}
