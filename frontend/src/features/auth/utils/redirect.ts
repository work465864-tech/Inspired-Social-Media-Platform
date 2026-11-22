export function getSafeReturnPath(search: string): string {
  const nextPath = new URLSearchParams(search).get('next');
  if (
    nextPath?.startsWith('/') &&
    !nextPath.startsWith('//') &&
    !nextPath.includes('\\')
  ) {
    return nextPath;
  }
  return '/feed';
}
