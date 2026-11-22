export function isNavigationItemActive(
  pathname: string | null,
  href: string,
): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}
