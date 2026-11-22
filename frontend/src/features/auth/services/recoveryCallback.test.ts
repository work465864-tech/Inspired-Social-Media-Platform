import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth } = vi.hoisted(() => ({
  auth: {
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
  },
}));

vi.mock('../../../lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth })),
}));

import { NextRequest } from 'next/server';
import { GET } from '../../../app/auth/callback/route';

describe('authentication callback recovery', () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
    auth.verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('verifies a recovery token hash and redirects to the password form', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?next=%2Freset-password&token_hash=valid-hash&type=recovery',
    );

    const response = await GET(request);

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'valid-hash',
      type: 'recovery',
    });
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/reset-password',
    );
  });

  it('rejects a token hash unless it is explicitly a recovery token', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/callback?next=%2Freset-password&token_hash=hash&type=signup',
    );

    const response = await GET(request);

    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/reset-password?status=invalid-link',
    );
  });
});
