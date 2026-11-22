import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));

vi.mock('../../../lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ auth: { verifyOtp } }),
}));

import { verifyPasswordRecoveryCode } from './recoveryService';

describe('verifyPasswordRecoveryCode', () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('verifies a recovery code against its account email', async () => {
    await verifyPasswordRecoveryCode(' Person@example.com ', '123456');

    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'person@example.com',
      token: '123456',
      type: 'recovery',
    });
  });

  it('rejects malformed codes without contacting Supabase', async () => {
    await expect(
      verifyPasswordRecoveryCode('person@example.com', '12-34'),
    ).rejects.toThrow('Enter the recovery code from your email.');
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
