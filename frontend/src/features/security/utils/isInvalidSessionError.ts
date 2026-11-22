export function isInvalidSessionError(error: {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
}): boolean {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';

  return (
    error.name === 'AuthSessionMissingError' ||
    error.status === 401 ||
    [
      'invalid_token',
      'session_not_found',
      'refresh_token_not_found',
      'refresh_token_already_used',
    ].includes(code) ||
    (error.status === 400 &&
      /invalid.*(token|session)|expired.*(token|session)|refresh token/.test(
        message,
      ))
  );
}
