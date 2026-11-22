'use client';

import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import Input from '../../../../components/ui/Input';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { useToast } from '../../../../providers/ToastProvider';
import { pendingVerificationEmailKey } from '../../constants/auth';
import { getAuthErrorMessage } from '../../utils/authErrorMessage';
import { resendSignupVerification } from '../../services/signupService';
import { AuthCard } from '../AuthCard';
import { AuthFooter } from '../AuthFooter';
import { AuthHeader } from '../AuthHeader';
import { FormField } from '../FormField';
import { emailSchema } from '../../schemas/authSchemas';
import { useAuth } from '../../hooks/useAuth';

type VerificationScreenProps = {
  status: 'failed' | null;
};

export default function VerificationScreen({
  status,
}: VerificationScreenProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const showToast = useToast();
  const { user } = useAuth();
  const isVerified = Boolean(user?.email_confirmed_at);

  useEffect(() => {
    setEmail(window.sessionStorage.getItem(pendingVerificationEmailKey) ?? '');
  }, []);

  async function handleResendVerification() {
    if (!email) {
      setEmailError('Enter the email address you used to sign up.');
      return;
    }

    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setEmailError(
        parsedEmail.error.issues[0]?.message ?? 'Enter a valid email address.',
      );
      return;
    }

    setIsResending(true);
    try {
      await resendSignupVerification(parsedEmail.data);
      window.sessionStorage.setItem(pendingVerificationEmailKey, email);
      showToast({
        title: 'Check your inbox',
        description:
          'If this address has an unverified account, a confirmation link will be sent.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Could not resend email',
        description: getAuthErrorMessage(error, 'verification'),
        variant: 'error',
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <MailCheck aria-hidden="true" className="h-7 w-7" />
      </div>
      <AuthHeader
        description={
          isVerified
            ? 'Your email address is verified and your account is ready.'
            : 'Confirm your email address to finish setting up your account.'
        }
        eyebrow={isVerified ? 'EMAIL VERIFIED' : 'CHECK YOUR INBOX'}
        title={isVerified ? 'You’re all set' : 'One small step'}
      />
      <div className="space-y-4">
        {status === 'failed' && !isVerified ? (
          <p
            aria-live="polite"
            className="rounded-control border border-red-500/30 bg-canvas/70 px-4 py-3 text-sm leading-6 text-red-700 dark:text-red-200"
            role="alert"
          >
            This verification link is invalid, expired, or already used. You can
            request a fresh email below.
          </p>
        ) : !isVerified ? (
          <p className="rounded-control border border-border bg-canvas/70 px-4 py-3 text-sm leading-6 text-muted">
            The verification message can take a minute to arrive. You can safely
            close this page while you check.
          </p>
        ) : null}
        {!isVerified && (
          <>
            <FormField
              error={emailError}
              htmlFor="verification-email"
              label="Email address"
            >
              <Input
                autoComplete="email"
                id="verification-email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError('');
                }}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </FormField>
            <LoadingButton
              className="w-full"
              loading={isResending}
              loadingLabel="Sending..."
              onClick={handleResendVerification}
              type="button"
              variant="secondary"
            >
              Resend verification email
            </LoadingButton>
          </>
        )}
      </div>
      <AuthFooter>
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href="/login"
        >
          Back to sign in
        </Link>
      </AuthFooter>
    </AuthCard>
  );
}
