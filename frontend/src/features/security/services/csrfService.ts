const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isSameOriginMutation(request: Request): boolean {
  if (safeMethods.has(request.method.toUpperCase())) {
    return true;
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === requestUrl.origin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    return false;
  }

  try {
    return new URL(referer).origin === requestUrl.origin;
  } catch {
    return false;
  }
}
