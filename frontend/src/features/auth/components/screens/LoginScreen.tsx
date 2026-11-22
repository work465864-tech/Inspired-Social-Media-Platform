'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Divider } from '../../../../components/ui/Divider';
import Input from '../../../../components/ui/Input';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { loginSchema } from '../../schemas/authSchemas';
import type { LoginFormValues } from '../../types/auth';
import { loginWithEmail } from '../../services/loginService';
import { getAuthErrorMessage } from '../../utils/authErrorMessage';
import { getSafeReturnPath } from '../../utils/redirect';
import { useToast } from '../../../../providers/ToastProvider';
import { AuthCard } from '../AuthCard';
import { AuthFooter } from '../AuthFooter';
import { AuthHeader } from '../AuthHeader';
import { ErrorText } from '../ErrorText';
import { FormField } from '../FormField';
import { PasswordInput } from '../PasswordInput';
import { SocialProviders } from '../SocialProviders';
import { useRequestGate } from '../../../security/hooks/useRequestGate';

type LoginScreenProps = {
  oauthStatus:
    | 'cancelled'
    | 'failed'
    | 'network'
    | 'profile-failed'
    | 'unavailable'
    | null;
};

export default function LoginScreen({ oauthStatus }: LoginScreenProps) {
  const router = useRouter();
  const showToast = useToast();
  const acquireRequest = useRequestGate(800);
  const handledOAuthStatus = useRef(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!oauthStatus || handledOAuthStatus.current) {
      return;
    }

    handledOAuthStatus.current = true;
    const profileCreationFailed = oauthStatus === 'profile-failed';
    const providerUnavailable = oauthStatus === 'unavailable';
    const networkFailed = oauthStatus === 'network';
    showToast({
      title:
        oauthStatus === 'cancelled'
          ? 'Sign-in cancelled'
          : profileCreationFailed
            ? 'Profile setup failed'
            : providerUnavailable
              ? 'Provider unavailable'
              : networkFailed
                ? 'Connection issue'
                : 'OAuth sign-in failed',
      description:
        oauthStatus === 'cancelled'
          ? 'You can try signing in again whenever you are ready.'
          : profileCreationFailed
            ? 'We could not create your account profile. Please try again or contact support.'
            : providerUnavailable
              ? 'This provider is not configured in Supabase yet.'
              : networkFailed
                ? 'Check your connection and try signing in again.'
                : 'We could not complete sign-in. Please try again.',
      variant: oauthStatus === 'cancelled' ? 'info' : 'error',
    });
    router.replace('/login', { scroll: false });
  }, [oauthStatus, router, showToast]);

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    const releaseRequest = acquireRequest();
    if (!releaseRequest) {
      showToast({
        title: 'Please wait',
        description: 'Wait a moment before trying to sign in again.',
        variant: 'info',
      });
      return;
    }

    try {
      await loginWithEmail(values);
      router.replace(getSafeReturnPath(window.location.search));
    } catch (error) {
      showToast({
        title: 'Sign in failed',
        description: getAuthErrorMessage(error, 'login'),
        variant: 'error',
      });
    } finally {
      releaseRequest();
    }
  };

  return (
    <AuthCard>
      <AuthHeader
        description="Sign in to pick up where your community left off."
        title="Welcome back"
      />
      <div className="space-y-5">
        <SocialProviders />
        <Divider />
        <form
          className="grid gap-4"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <FormField
            error={errors.email?.message}
            htmlFor="login-email"
            label="Email address"
          >
            <Input
              autoComplete="email"
              id="login-email"
              placeholder="you@example.com"
              type="email"
              {...register('email')}
            />
          </FormField>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="login-password"
              >
                Password
              </label>
              <Link
                className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              autoComplete="current-password"
              id="login-password"
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
              aria-invalid={Boolean(errors.password)}
              hasError={Boolean(errors.password)}
              {...register('password')}
            />
            <ErrorText
              id="login-password-error"
              message={errors.password?.message}
            />
          </div>
          <LoadingButton
            className="w-full"
            loading={isSubmitting}
            loadingLabel="Signing in..."
            type="submit"
          >
            Continue with email
          </LoadingButton>
        </form>
      </div>
      <AuthFooter>
        New to Connectly?{' '}
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href="/signup"
        >
          Create an account
        </Link>
      </AuthFooter>
    </AuthCard>
  );
}
