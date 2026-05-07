export type ApiResponse<T> = {
  code: number;
  message: string;
  data?: T;
};

export class ApiRequestError extends Error {
  status: number;
  code?: number;
  data?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code?: number;
      data?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;
  }
}

async function safeReadJson(response: Response) {
  try {
    return (await response.json()) as ApiResponse<unknown>;
  } catch {
    return null;
  }
}

export async function fetchApiJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const response = await fetch(input, init);
  const payload = await safeReadJson(response);

  if (!response.ok) {
    throw new ApiRequestError(
      payload?.message || `request failed with status: ${response.status}`,
      {
        status: response.status,
        code: payload?.code,
        data: payload?.data,
      }
    );
  }

  if (!payload) {
    throw new ApiRequestError('invalid api response', {
      status: response.status,
    });
  }

  if (payload.code !== 0) {
    throw new ApiRequestError(payload.message || 'request failed', {
      status: response.status,
      code: payload.code,
      data: payload.data,
    });
  }

  return payload as ApiResponse<T>;
}
