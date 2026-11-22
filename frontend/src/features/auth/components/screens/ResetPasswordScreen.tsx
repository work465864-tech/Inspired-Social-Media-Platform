'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import Input from '../../../../components/ui/Input';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { useToast } from '../../../../providers/ToastProvider';
import { resetPasswordSchema } from '../../schemas/authSchemas';
import {
  updatePassword,
  verifyPasswordRecoveryCode,
} from '../../services/recoveryService';
import type { ResetPasswordFormValues } from '../../types/auth';
import { getAuthErrorMessage } from '../../utils/authErrorMessage';
import { useAuth } from '../../hooks/useAuth';
import { AuthCard } from '../AuthCard';
import { AuthFooter } from '../AuthFooter';
import { AuthHeader } from '../AuthHeader';
import { FormField } from '../FormField';
import { PasswordInput } from '../PasswordInput';

type ResetPasswordScreenProps = {
  invalidLink: boolean;
};

export default function ResetPasswordScreen({
  invalidLink,
}: ResetPasswordScreenProps) {
  const router = useRouter();
  const showToast = useToast();
  const { isLoading, signOut, user } = useAuth();
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = async ({
    password,
  }) => {
    try {
      await updatePassword(password);
    } catch (error) {
      showToast({
        title: 'Password update failed',
        description: getAuthErrorMessage(error, 'reset'),
        variant: 'error',
      });
      return;
    }

    try {
      await signOut();
      showToast({
        title: 'Password updated',
        description: 'Sign in with your new password.',
        variant: 'success',
      });
      router.replace('/login');
    } catch (error) {
      showToast({
        title: 'Password updated',
        description:
          'Your password was changed, but we could not sign out this session. Please sign out manually.',
        variant: 'error',
      });
      console.error('Unable to sign out after password reset:', error);
      router.replace('/');
    }
  };

  async function onVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifyingCode(true);
    try {
      await verifyPasswordRecoveryCode(recoveryEmail, recoveryCode);
      setRecoveryVerified(true);
      showToast({
        title: 'Email verified',
        description: 'You can now choose a new password.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Recovery code could not be verified',
        description: getAuthErrorMessage(error, 'reset'),
        variant: 'error',
      });
    } finally {
      setIsVerifyingCode(false);
    }
  }

  const canResetPassword = !isLoading && (recoveryVerified || Boolean(user));
  const canVerifyRecoveryCode = !isLoading && !canResetPassword;

  return (
    <AuthCard>
      <AuthHeader
        description={
          canResetPassword
            ? 'Choose a new password you have not used before.'
            : 'Enter the recovery code from your email to continue.'
        }
        eyebrow="ACCOUNT RECOVERY"
        title={
          canResetPassword ? 'Set a new password' : 'Verify your recovery code'
        }
      />
      {canResetPassword ? (
        <form
          className="grid gap-4"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            error={errors.password?.message}
            hint="Use at least 8 characters, including uppercase, lowercase, a number, and a symbol."
            htmlFor="reset-password"
            label="New password"
          >
            <PasswordInput
              autoComplete="new-password"
              id="reset-password"
              {...register('password')}
            />
          </FormField>
          <FormField
            error={errors.confirmPassword?.message}
            htmlFor="reset-confirm-password"
            label="Confirm new password"
          >
            <PasswordInput
              autoComplete="new-password"
              id="reset-confirm-password"
              placeholder="Enter your new password again"
              {...register('confirmPassword')}
            />
          </FormField>
          <LoadingButton
            className="w-full"
            loading={isSubmitting}
            loadingLabel="Updating password..."
            type="submit"
          >
            Save new password
          </LoadingButton>
        </form>
      ) : canVerifyRecoveryCode ? (
        <div className="space-y-4">
          {invalidLink && (
            <p
              aria-live="polite"
              className="rounded-control border border-border bg-canvas/70 px-4 py-3 text-sm leading-6 text-muted"
              role="status"
            >
              The email link expired or was already opened. Enter the recovery
              code from the same email to continue.
            </p>
          )}
          <form className="grid gap-4" onSubmit={onVerifyCode}>
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="recovery-code-email"
              >
                Account email
              </label>
              <Input
                autoComplete="email"
                id="recovery-code-email"
                onChange={(event) =>
                  setRecoveryEmail(event.currentTarget.value)
                }
                required
                type="email"
                value={recoveryEmail}
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="recovery-code"
              >
                Recovery code
              </label>
              <Input
                autoComplete="one-time-code"
                id="recovery-code"
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setRecoveryCode(
                    event.currentTarget.value.replace(/\D/g, '').slice(0, 10),
                  )
                }
                required
                value={recoveryCode}
              />
            </div>
            <LoadingButton
              className="w-full"
              loading={isVerifyingCode}
              loadingLabel="Verifying code..."
              type="submit"
            >
              Verify code
            </LoadingButton>
          </form>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            href="/forgot-password"
          >
            Request a new reset email
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p
            aria-live="polite"
            className="rounded-control border border-border bg-canvas/70 px-4 py-3 text-sm leading-6 text-muted"
            role={invalidLink ? 'alert' : 'status'}
          >
            Checking your recovery link...
          </p>
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            href="/forgot-password"
          >
            Request a new reset link
          </Link>
        </div>
      )}
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
