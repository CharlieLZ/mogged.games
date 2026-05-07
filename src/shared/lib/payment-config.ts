function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasRequiredValue(value: unknown) {
  return trimString(value).length > 0;
}

type JsonParseResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      reason: string;
    };

type StringMapConfigParseOptions = {
  configKey?: string;
  logger?: Pick<Console, 'warn'>;
};

const warnedStringMapConfigFailures = new Set<string>();

function isJsonLike(value: string) {
  return (
    value.startsWith('{') ||
    value.startsWith('[') ||
    value.startsWith('"{') ||
    value.startsWith('"[')
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function tryParseJsonResult(value: string): JsonParseResult {
  if (!value) {
    return {
      ok: false,
      reason: 'empty value',
    };
  }

  const attempts = [value];
  let reason = 'invalid JSON';

  if (value.includes('\\"')) {
    attempts.push(value.replace(/\\"/g, '"'));
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (typeof parsed === 'string' && parsed !== attempt) {
        const nested = tryParseJsonResult(parsed);
        if (nested.ok) {
          return nested;
        }
      }

      return {
        ok: true,
        value: parsed,
      };
    } catch (error) {
      reason = getErrorMessage(error);
    }
  }

  return {
    ok: false,
    reason,
  };
}

function tryParseJson(value: string): unknown {
  const result = tryParseJsonResult(value);
  return result.ok ? result.value : undefined;
}

function warnInvalidStringMapConfig(
  value: string,
  reason: string,
  options?: StringMapConfigParseOptions
) {
  if (!options?.configKey || !isJsonLike(value)) {
    return;
  }

  const warningKey = `${options.configKey}:${value.length}:${reason}`;
  if (warnedStringMapConfigFailures.has(warningKey)) {
    return;
  }

  warnedStringMapConfigFailures.add(warningKey);
  (options.logger ?? console).warn(
    '[payment-config] invalid JSON map config',
    {
      configKey: options.configKey,
      length: value.length,
      reason,
    }
  );
}

export function parsePaymentMethodList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => trimString(item))
      .filter(Boolean);
  }

  const normalized = trimString(value);
  if (!normalized) {
    return [];
  }

  const parsed = tryParseJson(normalized);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => trimString(item))
      .filter(Boolean);
  }

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseStringMapConfig(
  value: unknown,
  options?: StringMapConfigParseOptions
): Record<string, string> | undefined {
  const normalized = trimString(value);
  if (!normalized) {
    return undefined;
  }

  const parsedResult = tryParseJsonResult(normalized);
  if (!parsedResult.ok) {
    warnInvalidStringMapConfig(normalized, parsedResult.reason, options);
    return undefined;
  }

  const parsed = parsedResult.value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(parsed)
      .map(([key, entryValue]) => [trimString(key), trimString(entryValue)])
      .filter(([key, entryValue]) => key && entryValue)
  );
}

type PaymentProviderConfigs = Record<string, unknown>;

export function hasStripeCheckoutConfigs(configs: PaymentProviderConfigs) {
  return (
    hasRequiredValue(configs.stripe_publishable_key) &&
    hasRequiredValue(configs.stripe_secret_key) &&
    hasRequiredValue(configs.stripe_signing_secret)
  );
}

export function hasPayPalCheckoutConfigs(configs: PaymentProviderConfigs) {
  return (
    hasRequiredValue(configs.paypal_client_id) &&
    hasRequiredValue(configs.paypal_client_secret) &&
    hasRequiredValue(configs.paypal_webhook_id)
  );
}

export function hasCreemCheckoutConfigs(configs: PaymentProviderConfigs) {
  const productIds = parseStringMapConfig(configs.creem_product_ids, {
    configKey: 'creem_product_ids',
  });

  return (
    hasRequiredValue(configs.creem_api_key) &&
    hasRequiredValue(configs.creem_signing_secret) &&
    !!productIds &&
    Object.keys(productIds).length > 0
  );
}
