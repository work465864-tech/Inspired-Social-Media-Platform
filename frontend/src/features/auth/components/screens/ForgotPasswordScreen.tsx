'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import Input from '../../../../components/ui/Input';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { useToast } from '../../../../providers/ToastProvider';
import { forgotPasswordSchema } from '../../schemas/authSchemas';
import type { ForgotPasswordFormValues } from '../../types/auth';
import { getAuthErrorMessage } from '../../utils/authErrorMessage';
import { requestPasswordReset } from '../../services/recoveryService';
import { AuthCard } from '../AuthCard';
import { AuthFooter } from '../AuthFooter';
import { AuthHeader } from '../AuthHeader';
import { FormField } from '../FormField';

export default function ForgotPasswordScreen() {
  const showToast = useToast();
  const [sentToEmail, setSentToEmail] = useState('');
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const email = watch('email')?.trim() ?? '';

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = async (values) => {
    try {
      await requestPasswordReset(values.email);
      setSentToEmail(values.email);
      showToast({
        title: 'Check your inbox',
        description:
          'If an account exists for that address, a password reset link will be sent.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Could not send reset email',
        description: getAuthErrorMessage(error, 'recovery'),
        variant: 'error',
      });
    }
  };

  return (
    <AuthCard>
      <AuthHeader
        description="Enter the email address associated with your account."
        eyebrow="ACCOUNT RECOVERY"
        title="Forgot your password?"
      />
      <form className="grid gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormField
          error={errors.email?.message}
          htmlFor="recovery-email"
          label="Email address"
        >
          <Input
            autoComplete="email"
            id="recovery-email"
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
        </FormField>
        {sentToEmail && sentToEmail === email && (
          <p aria-live="polite" className="text-sm text-accent" role="status">
            If an account exists for that address, a reset email will be sent.
            Use its recovery code on the next screen.
          </p>
        )}
        <LoadingButton
          className="w-full"
          disabled={sentToEmail !== '' && sentToEmail === email}
          loading={isSubmitting}
          loadingLabel="Sending reset link..."
          type="submit"
        >
          {sentToEmail === email && email ? 'Email sent' : 'Continue'}
        </LoadingButton>
      </form>
      <AuthFooter>
        Remembered it?{' '}
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
