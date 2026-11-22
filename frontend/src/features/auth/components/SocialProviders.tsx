'use client';

import { SocialButton } from './SocialButton';
import { useOAuth } from '../hooks/useOAuth';

export function SocialProviders() {
  const { processingProvider, signInWithProvider } = useOAuth();

  return (
    <div className="grid grid-cols-2 gap-3">
      <SocialButton
        disabled={processingProvider !== null}
        loading={processingProvider === 'google'}
        onClick={() => void signInWithProvider('google')}
        provider="Google"
      />
      <SocialButton
        disabled={processingProvider !== null}
        loading={processingProvider === 'github'}
        onClick={() => void signInWithProvider('github')}
        provider="GitHub"
      />
    </div>
  );
}
