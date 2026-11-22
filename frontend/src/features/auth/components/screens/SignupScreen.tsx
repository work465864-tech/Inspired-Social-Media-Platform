'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Divider } from '../../../../components/ui/Divider';
import Input from '../../../../components/ui/Input';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import type { SignupFormValues } from '../../types/auth';
import { signupSchema } from '../../schemas/authSchemas';
import { getAuthErrorMessage } from '../../utils/authErrorMessage';
import { getSafeReturnPath } from '../../utils/redirect';
import { AuthCard } from '../AuthCard';
import { AuthFooter } from '../AuthFooter';
import { AuthHeader } from '../AuthHeader';
import { FormField } from '../FormField';
import { PasswordInput } from '../PasswordInput';
import { SocialProviders } from '../SocialProviders';
import { pendingVerificationEmailKey } from '../../constants/auth';
import { signupWithEmail } from '../../services/signupService';
import { useToast } from '../../../../providers/ToastProvider';
import { useRouter } from 'next/navigation';

export default function SignupScreen() {
  const router = useRouter();
  const showToast = useToast();
  const [signupMessage, setSignupMessage] = useState('');
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
  });

  const onSubmit: SubmitHandler<SignupFormValues> = async (values) => {
    setSignupMessage('');

    try {
      const result = await signupWithEmail(values);
      if (result.sessionCreated) {
        showToast({
          title: 'Account created',
          description: 'You are signed in.',
          variant: 'success',
        });
        router.replace(getSafeReturnPath(window.location.search));
        return;
      }

      if (result.emailConfirmationRequired) {
        window.sessionStorage.setItem(
          pendingVerificationEmailKey,
          values.email,
        );
        router.replace('/verification');
        return;
      }

      setSignupMessage('Account created successfully. You can now sign in.');
      showToast({
        title: 'Account created',
        description: 'Your account is ready.',
        variant: 'success',
      });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'signup');
      showToast({
        title: 'Sign up failed',
        description: message,
        variant: 'error',
      });
    }
  };

  return (
    <AuthCard>
      <AuthHeader
        description="Create your space and bring your people a little closer."
        title="Find your people"
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
            error={errors.fullName?.message}
            htmlFor="signup-full-name"
            label="Full Name"
          >
            <Input
              autoComplete="name"
              id="signup-full-name"
              placeholder="Your full name"
              {...register('fullName')}
            />
          </FormField>
          <FormField
            error={errors.username?.message}
            htmlFor="signup-username"
            label="Username"
          >
            <Input
              autoComplete="username"
              id="signup-username"
              placeholder="yourname"
              {...register('username')}
            />
          </FormField>
          <FormField
            error={errors.email?.message}
            htmlFor="signup-email"
            label="Email address"
          >
            <Input
              autoComplete="email"
              id="signup-email"
              placeholder="you@example.com"
              type="email"
              {...register('email')}
            />
          </FormField>
          <FormField
            error={errors.password?.message}
            htmlFor="signup-password"
            label="Password"
          >
            <PasswordInput
              autoComplete="new-password"
              id="signup-password"
              placeholder="8+ characters, mixed case, number & symbol"
              {...register('password')}
            />
          </FormField>
          <FormField
            error={errors.confirmPassword?.message}
            htmlFor="signup-confirm-password"
            label="Confirm password"
          >
            <PasswordInput
              autoComplete="new-password"
              id="signup-confirm-password"
              placeholder="Enter your password again"
              {...register('confirmPassword')}
            />
          </FormField>

          {signupMessage && (
            <p aria-live="polite" className="text-sm text-accent" role="status">
              {signupMessage}
            </p>
          )}
          <LoadingButton
            className="w-full"
            loading={isSubmitting}
            loadingLabel="Creating account..."
            type="submit"
          >
            Create account
          </LoadingButton>
        </form>
      </div>
      <AuthFooter>
        Already have an account?{' '}
        <Link
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href="/login"
        >
          Sign in
        </Link>
      </AuthFooter>
    </AuthCard>
  );
}
