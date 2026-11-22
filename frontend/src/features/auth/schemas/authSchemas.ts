import { z } from 'zod';
import {
  secureEmailSchema,
  securePasswordSchema,
  secureUsernameSchema,
} from '../../security/schemas/securitySchemas';
import { sanitizePlainText } from '../../security/utils/sanitizeText';

export const emailSchema = secureEmailSchema;
export const passwordSchema = securePasswordSchema;

const loginPasswordSchema = z
  .string()
  .min(1, 'Enter your password.')
  .max(128, 'Password must be 128 characters or fewer.');

export const fullNameSchema = z
  .string()
  .transform(sanitizePlainText)
  .pipe(
    z
      .string()
      .min(1, 'Enter your full name.')
      .max(80, 'Full name must be 80 characters or fewer.'),
  );

export const usernameSchema = secureUsernameSchema;

export const confirmPasswordSchema = z
  .string()
  .min(1, 'Confirm your password.');

export const signupSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
