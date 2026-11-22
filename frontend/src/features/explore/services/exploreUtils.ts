export function withExploreTimeout<T>(
  signal: AbortSignal,
  timeoutMs: number,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error('Explore request timed out.'));
  }, timeoutMs);
  const abortParent = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abortParent, { once: true });

  return request(controller.signal).finally(() => {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abortParent);
  });
}
