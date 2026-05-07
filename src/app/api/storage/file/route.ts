import { getAllConfigs } from '@/shared/models/config';

const ALLOWED_PREFIXES = ['uploads/', 'ai/'];

const normalizeKey = (raw: string) => raw.replace(/^\/+/, '');

const isAllowedKey = (key: string) => {
  if (!key || key.includes('..')) return false;
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const encodeKeyPath = (key: string) =>
  key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawKey = searchParams.get('key');
  if (!rawKey) {
    return new Response('Missing key', { status: 400 });
  }

  const key = normalizeKey(rawKey);
  if (!isAllowedKey(key)) {
    return new Response('Forbidden', { status: 403 });
  }

  const configs = await getAllConfigs();

  const hasR2 =
    configs.r2_access_key &&
    configs.r2_secret_key &&
    configs.r2_bucket_name &&
    (configs.r2_endpoint || configs.r2_account_id);
  const hasS3 =
    configs.s3_access_key &&
    configs.s3_secret_key &&
    configs.s3_bucket &&
    configs.s3_endpoint &&
    configs.s3_region;

  if (!hasR2 && !hasS3) {
    return new Response('Storage not configured', { status: 500 });
  }

  const endpoint = hasR2
    ? configs.r2_endpoint ||
      `https://${configs.r2_account_id}.r2.cloudflarestorage.com`
    : configs.s3_endpoint;
  const baseUrl = endpoint.replace(/\/$/, '');
  const bucket = hasR2 ? configs.r2_bucket_name : configs.s3_bucket;
  const url = `${baseUrl}/${bucket}/${encodeKeyPath(key)}`;

  const { AwsClient } = await import('aws4fetch');
  const client = new AwsClient({
    accessKeyId: hasR2 ? configs.r2_access_key : configs.s3_access_key,
    secretAccessKey: hasR2 ? configs.r2_secret_key : configs.s3_secret_key,
    region: hasR2 ? 'auto' : configs.s3_region,
  });

  const range = req.headers.get('range');
  const headers: Record<string, string> = {};
  if (range) {
    headers['Range'] = range;
  }

  const upstream = await client.fetch(url, {
    method: 'GET',
    headers,
  });

  if (!upstream.ok) {
    return new Response('Not found', { status: upstream.status });
  }

  const responseHeaders = new Headers();
  const passthroughHeaders = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ];
  for (const headerName of passthroughHeaders) {
    const value = upstream.headers.get(headerName);
    if (value) {
      responseHeaders.set(headerName, value);
    }
  }
  responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
