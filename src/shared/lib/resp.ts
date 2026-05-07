export function respData<T = unknown>(data: T) {
  return respJson(0, 'ok', data ?? []);
}

export function respOk() {
  return respJson(0, 'ok');
}

export function respErr(message: string) {
  return respJson(-1, message);
}

export function respErrWithStatus(
  message: string,
  status: number,
  init?: Omit<ResponseInit, 'status'>
) {
  return Response.json(
    {
      code: -1,
      message,
    },
    {
      status,
      ...init,
    }
  );
}

export function respJson<T = unknown>(code: number, message: string, data?: T) {
  const json = {
    code: code,
    message: message,
    data: data,
  };
  if (data !== undefined) {
    json['data'] = data;
  }

  return Response.json(json);
}
