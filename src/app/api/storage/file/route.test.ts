import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getAllConfigs: vi.fn(),
  awsFetch: vi.fn(),
  awsClientConfigs: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/shared/models/config', () => ({
  getAllConfigs: mocks.getAllConfigs,
}));

vi.mock('aws4fetch', () => ({
  AwsClient: class MockAwsClient {
    constructor(configs: Record<string, unknown>) {
      mocks.awsClientConfigs.push(configs);
    }

    fetch(url: string, init?: RequestInit) {
      return mocks.awsFetch(url, init);
    }
  },
}));

describe('/api/storage/file contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.awsClientConfigs.length = 0;
  });

  it('requires a storage key', async () => {
    const response = await GET(
      new Request('https://example.com/api/storage/file')
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Missing key');
  });

  it('rejects keys outside the allowed storage prefixes', async () => {
    const response = await GET(
      new Request(
        'https://example.com/api/storage/file?key=../../private/secret.txt'
      )
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  });

  it('proxies the upstream object and preserves range-aware response headers', async () => {
    mocks.getAllConfigs.mockResolvedValue({
      r2_access_key: 'r2-access',
      r2_secret_key: 'r2-secret',
      r2_bucket_name: 'imageeditorai',
      r2_endpoint: 'https://r2.example.com',
      r2_account_id: '',
      s3_access_key: '',
      s3_secret_key: '',
      s3_bucket: '',
      s3_endpoint: '',
      s3_region: '',
    });
    mocks.awsFetch.mockResolvedValue(
      new Response('ok', {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': '2',
          'Content-Range': 'bytes 0-1/2',
          'Accept-Ranges': 'bytes',
          ETag: 'etag-1',
          'Last-Modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
        },
      })
    );

    const response = await GET(
      new Request(
        'https://example.com/api/storage/file?key=uploads/video/test.mp4',
        {
          headers: {
            Range: 'bytes=0-1',
          },
        }
      )
    );

    expect(mocks.awsClientConfigs).toEqual([
      {
        accessKeyId: 'r2-access',
        secretAccessKey: 'r2-secret',
        region: 'auto',
      },
    ]);
    expect(mocks.awsFetch).toHaveBeenCalledWith(
      'https://r2.example.com/imageeditorai/uploads/video/test.mp4',
      {
        method: 'GET',
        headers: {
          Range: 'bytes=0-1',
        },
      }
    );
    expect(response.status).toBe(206);
    expect(response.headers.get('content-type')).toBe('video/mp4');
    expect(response.headers.get('content-range')).toBe('bytes 0-1/2');
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable'
    );
    expect(await response.text()).toBe('ok');
  });
});
