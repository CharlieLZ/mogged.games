import { headers } from 'next/headers';

export async function getPathname() {
  try {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname');
    if (pathname?.trim()) {
      return pathname;
    }

    const requestUrl = headersList.get('x-url');
    if (requestUrl?.trim()) {
      try {
        const parsed = new URL(requestUrl);
        return `${parsed.pathname}${parsed.search}`;
      } catch {
        return requestUrl;
      }
    }
  } catch {
    return null;
  }

  return null;
}
