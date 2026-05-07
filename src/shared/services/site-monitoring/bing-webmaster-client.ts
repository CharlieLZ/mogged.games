import 'server-only';

const BING_WEBMASTER_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

type BingClientOptions = {
  apiKey: string;
  maxRetries?: number;
  retryDelayMs?: number;
};

type BingUserSite = {
  SiteUrl?: string;
};

type BingGenericRecord = Record<string, unknown>;

type BingUrlSubmissionQuota = {
  DailyQuota?: number | string;
  MonthlyQuota?: number | string;
};

function trimValue(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldRetryStatus(status: number) {
  return status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripBingMetadata<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripBingMetadata(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '__type')
        .map(([key, entry]) => [key, stripBingMetadata(entry)])
    ) as T;
  }

  return value;
}

export class BingWebmasterClient {
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(options: BingClientOptions) {
    this.apiKey = trimValue(options.apiKey);
    this.maxRetries = Math.max(0, options.maxRetries ?? 2);
    this.retryDelayMs = Math.max(1, options.retryDelayMs ?? 300);
  }

  private getRequiredApiKey() {
    if (!this.apiKey) {
      throw new Error('BING_WEBMASTER_API_KEY is missing');
    }

    return this.apiKey;
  }

  private async request<T>(methodName: string, params?: Record<string, string>) {
    const url = new URL(`${BING_WEBMASTER_API_BASE}/${methodName}`);
    url.searchParams.set('apikey', this.getRequiredApiKey());

    for (const [key, value] of Object.entries(params || {})) {
      if (trimValue(value)) {
        url.searchParams.set(key, value);
      }
    }

    let attempt = 0;

    while (true) {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
        });
        const body = await response.text();

        if (!response.ok) {
          if (attempt < this.maxRetries && shouldRetryStatus(response.status)) {
            attempt += 1;
            await wait(this.retryDelayMs * attempt);
            continue;
          }

          throw new Error(
            `Bing Webmaster API ${methodName} failed with ${response.status}: ${body || 'empty response'}`
          );
        }

        const parsed = body ? JSON.parse(body) : {};
        return stripBingMetadata((parsed?.d ?? parsed) as T);
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw error;
        }

        attempt += 1;
        await wait(this.retryDelayMs * attempt);
      }
    }
  }

  async getUserSites() {
    const response = await this.request<Array<BingUserSite | string>>('GetUserSites');

    return response
      .map((entry) =>
        typeof entry === 'string' ? trimValue(entry) : trimValue(entry?.SiteUrl)
      )
      .filter(Boolean);
  }

  async getUrlSubmissionQuota(siteUrl: string) {
    const response = await this.request<BingUrlSubmissionQuota>(
      'GetUrlSubmissionQuota',
      {
        siteUrl,
      }
    );

    return {
      DailyQuota: toNumber(response?.DailyQuota),
      MonthlyQuota: toNumber(response?.MonthlyQuota),
    };
  }

  async getSiteRoles(siteUrl: string) {
    return this.request<BingGenericRecord[]>('GetSiteRoles', {
      siteUrl,
    });
  }

  async getQueryStats(siteUrl: string) {
    return this.request<BingGenericRecord[]>('GetQueryStats', {
      siteUrl,
    });
  }

  async getPageStats(siteUrl: string) {
    return this.request<BingGenericRecord[]>('GetPageStats', {
      siteUrl,
    });
  }

  async getFeeds(siteUrl: string) {
    return this.request<BingGenericRecord[]>('GetFeeds', {
      siteUrl,
    });
  }

  async getQueryParameters(siteUrl: string) {
    return this.request<BingGenericRecord[]>('GetQueryParameters', {
      siteUrl,
    });
  }

  async getUrlInfo(siteUrl: string, url: string) {
    return this.request<BingGenericRecord>('GetUrlInfo', {
      siteUrl,
      url,
    });
  }
}
