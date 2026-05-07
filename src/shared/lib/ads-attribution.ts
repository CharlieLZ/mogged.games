export const ADS_ATTRIBUTION_COOKIE_NAME = 'hh_ads_attribution';

type MaybeString = string | null | undefined;

export type AdsAttributionSnapshot = {
  source?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_batch?: string;
  utm_objective?: string;
  utm_campaign?: string;
  utm_adgroup?: string;
  utm_content?: string;
  utm_term?: string;
  utm_match?: string;
  utm_lang?: string;
  utm_device?: string;
  utm_workflow?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  landing_path?: string;
  landing_url?: string;
  locale?: string;
  countryCode?: string;
  regionCode?: string;
  deviceType?: string;
};

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value: MaybeString, maxLength: number): string | undefined {
  const normalized = trimString(value);
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function serializeAdsAttributionCookie(
  snapshot: AdsAttributionSnapshot
): string {
  return encodeURIComponent(JSON.stringify(snapshot));
}

export function parseAdsAttributionCookie(
  value?: string | null
): AdsAttributionSnapshot | null {
  const raw = trimString(value);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      source: normalizeText(parsed.source as MaybeString, 128),
      referrer: normalizeText(parsed.referrer as MaybeString, 512),
      utm_source: normalizeText(parsed.utm_source as MaybeString, 128),
      utm_medium: normalizeText(parsed.utm_medium as MaybeString, 128),
      utm_batch: normalizeText(parsed.utm_batch as MaybeString, 128),
      utm_objective: normalizeText(parsed.utm_objective as MaybeString, 128),
      utm_campaign: normalizeText(parsed.utm_campaign as MaybeString, 255),
      utm_adgroup: normalizeText(parsed.utm_adgroup as MaybeString, 255),
      utm_content: normalizeText(parsed.utm_content as MaybeString, 255),
      utm_term: normalizeText(parsed.utm_term as MaybeString, 255),
      utm_match: normalizeText(parsed.utm_match as MaybeString, 64),
      utm_lang: normalizeText(parsed.utm_lang as MaybeString, 24),
      utm_device: normalizeText(parsed.utm_device as MaybeString, 24),
      utm_workflow: normalizeText(parsed.utm_workflow as MaybeString, 64),
      gclid: normalizeText(parsed.gclid as MaybeString, 255),
      gbraid: normalizeText(parsed.gbraid as MaybeString, 255),
      wbraid: normalizeText(parsed.wbraid as MaybeString, 255),
      fbclid: normalizeText(parsed.fbclid as MaybeString, 255),
      msclkid: normalizeText(parsed.msclkid as MaybeString, 255),
      landing_path: normalizeText(parsed.landing_path as MaybeString, 255),
      landing_url: normalizeText(parsed.landing_url as MaybeString, 512),
      locale: normalizeText(parsed.locale as MaybeString, 24),
      countryCode: normalizeText(parsed.countryCode as MaybeString, 8),
      regionCode: normalizeText(parsed.regionCode as MaybeString, 16),
      deviceType: normalizeText(parsed.deviceType as MaybeString, 24),
    };
  } catch {
    return null;
  }
}

export function readAdsAttributionCookieFromHeader(
  cookieHeader?: string | null
): AdsAttributionSnapshot | null {
  const cookies = trimString(cookieHeader);
  if (!cookies) {
    return null;
  }

  const match = cookies
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${ADS_ATTRIBUTION_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return parseAdsAttributionCookie(match.slice(ADS_ATTRIBUTION_COOKIE_NAME.length + 1));
}

export function mergeAdsAttributionSnapshots(input: {
  cookieSnapshot?: AdsAttributionSnapshot | null;
  requestSnapshot?: AdsAttributionSnapshot | null;
}): AdsAttributionSnapshot {
  return {
    ...(input.cookieSnapshot || {}),
    ...(input.requestSnapshot || {}),
    gclid: input.cookieSnapshot?.gclid || input.requestSnapshot?.gclid,
    gbraid: input.cookieSnapshot?.gbraid || input.requestSnapshot?.gbraid,
    wbraid: input.cookieSnapshot?.wbraid || input.requestSnapshot?.wbraid,
    fbclid: input.cookieSnapshot?.fbclid || input.requestSnapshot?.fbclid,
    msclkid: input.cookieSnapshot?.msclkid || input.requestSnapshot?.msclkid,
    landing_path:
      input.cookieSnapshot?.landing_path || input.requestSnapshot?.landing_path,
    landing_url:
      input.cookieSnapshot?.landing_url || input.requestSnapshot?.landing_url,
    utm_source:
      input.cookieSnapshot?.utm_source || input.requestSnapshot?.utm_source,
    utm_medium:
      input.cookieSnapshot?.utm_medium || input.requestSnapshot?.utm_medium,
    utm_batch:
      input.cookieSnapshot?.utm_batch || input.requestSnapshot?.utm_batch,
    utm_objective:
      input.cookieSnapshot?.utm_objective ||
      input.requestSnapshot?.utm_objective,
    utm_campaign:
      input.cookieSnapshot?.utm_campaign || input.requestSnapshot?.utm_campaign,
    utm_adgroup:
      input.cookieSnapshot?.utm_adgroup || input.requestSnapshot?.utm_adgroup,
    utm_content:
      input.cookieSnapshot?.utm_content || input.requestSnapshot?.utm_content,
    utm_term:
      input.cookieSnapshot?.utm_term || input.requestSnapshot?.utm_term,
    utm_match:
      input.cookieSnapshot?.utm_match || input.requestSnapshot?.utm_match,
    utm_lang:
      input.cookieSnapshot?.utm_lang || input.requestSnapshot?.utm_lang,
    utm_device:
      input.cookieSnapshot?.utm_device || input.requestSnapshot?.utm_device,
    utm_workflow:
      input.cookieSnapshot?.utm_workflow ||
      input.requestSnapshot?.utm_workflow,
  };
}

export function shouldPersistAdsAttribution(snapshot: AdsAttributionSnapshot): boolean {
  return Boolean(
    snapshot.gclid ||
      snapshot.gbraid ||
      snapshot.wbraid ||
      snapshot.utm_source ||
      snapshot.utm_medium ||
      snapshot.utm_campaign
  );
}

export function buildAdsAttributionSnapshotFromUrl(params: {
  url: URL;
  locale?: string | null;
}): AdsAttributionSnapshot {
  const { url } = params;
  const readParam = (key: string, maxLength: number) =>
    normalizeText(url.searchParams.get(key), maxLength);

  return {
    source:
      readParam('utm_source', 128) ||
      normalizeText(url.hostname, 128) ||
      undefined,
    utm_source: readParam('utm_source', 128),
    utm_medium: readParam('utm_medium', 128),
    utm_batch: readParam('utm_batch', 128),
    utm_objective: readParam('utm_objective', 128),
    utm_campaign: readParam('utm_campaign', 255),
    utm_adgroup: readParam('utm_adgroup', 255),
    utm_content: readParam('utm_content', 255),
    utm_term: readParam('utm_term', 255),
    utm_match: readParam('utm_match', 64),
    utm_lang: readParam('utm_lang', 24),
    utm_device: readParam('utm_device', 24),
    utm_workflow: readParam('utm_workflow', 64),
    gclid: readParam('gclid', 255),
    gbraid: readParam('gbraid', 255),
    wbraid: readParam('wbraid', 255),
    fbclid: readParam('fbclid', 255),
    msclkid: readParam('msclkid', 255),
    landing_path: normalizeText(url.pathname, 255),
    landing_url: normalizeText(url.toString(), 512),
    locale: normalizeText(params.locale, 24),
  };
}
