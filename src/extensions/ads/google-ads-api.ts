import 'server-only';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_API_VERSION = 'v22';
const GOOGLE_ADS_BASE_URL = 'https://googleads.googleapis.com';

type ClickIdentifierInput = {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
};

export type UploadClickConversionInput = ClickIdentifierInput & {
  customerId: string;
  conversionActionId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  conversionValue: number;
  currencyCode: string;
  conversionDateTime: string;
  orderId: string;
  loginCustomerId?: string;
};

export class GoogleAdsUploadError extends Error {
  status?: number;
  requestId?: string;

  constructor(message: string, options?: { status?: number; requestId?: string }) {
    super(message);
    this.name = 'GoogleAdsUploadError';
    this.status = options?.status;
    this.requestId = options?.requestId;
  }
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCustomerId(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { text } : {};
}

async function refreshAccessToken(input: UploadClickConversionInput) {
  const body = new URLSearchParams({
    client_id: trimString(input.clientId),
    client_secret: trimString(input.clientSecret),
    refresh_token: trimString(input.refreshToken),
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const payload = await parseResponse(response);

  if (!response.ok || !trimString((payload as { access_token?: string }).access_token)) {
    throw new GoogleAdsUploadError('failed to refresh google ads access token', {
      status: response.status,
    });
  }

  return trimString((payload as { access_token?: string }).access_token);
}

export async function uploadClickConversion(input: UploadClickConversionInput) {
  const customerId = normalizeCustomerId(input.customerId);
  const conversionActionId = normalizeCustomerId(input.conversionActionId);
  if (!customerId || !conversionActionId) {
    throw new GoogleAdsUploadError('missing google ads customer or conversion action id');
  }

  const accessToken = await refreshAccessToken(input);
  const response = await fetch(
    `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_API_VERSION}/customers/${customerId}:uploadClickConversions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'developer-token': trimString(input.developerToken),
        ...(trimString(input.loginCustomerId)
          ? { 'login-customer-id': normalizeCustomerId(input.loginCustomerId) }
          : {}),
      },
      body: JSON.stringify({
        conversions: [
          {
            conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
            conversionDateTime: input.conversionDateTime,
            conversionValue: input.conversionValue,
            currencyCode: trimString(input.currencyCode).toUpperCase(),
            orderId: trimString(input.orderId),
            ...(trimString(input.gclid) ? { gclid: trimString(input.gclid) } : {}),
            ...(trimString(input.gbraid)
              ? { gbraid: trimString(input.gbraid) }
              : {}),
            ...(trimString(input.wbraid)
              ? { wbraid: trimString(input.wbraid) }
              : {}),
          },
        ],
        partialFailure: true,
      }),
    }
  );

  const payload = await parseResponse(response);
  const requestId = response.headers.get('request-id') || '';

  if (!response.ok) {
    throw new GoogleAdsUploadError('google ads click conversion upload failed', {
      status: response.status,
      requestId,
    });
  }

  if ((payload as { partialFailureError?: unknown }).partialFailureError) {
    throw new GoogleAdsUploadError('google ads click conversion upload partially failed', {
      status: response.status,
      requestId,
    });
  }

  const firstResult = Array.isArray((payload as { results?: unknown[] }).results)
    ? (payload as { results?: Record<string, unknown>[] }).results?.[0]
    : null;

  return {
    requestId,
    jobId: (payload as { jobId?: number }).jobId,
    result: firstResult,
  };
}
