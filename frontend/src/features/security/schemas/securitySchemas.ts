import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitizeText';

export const secureEmailSchema = z
  .string()
  .transform((value) => sanitizePlainText(value).toLowerCase())
  .pipe(z.string().email('Enter a valid email address.'));

export const secureUsernameSchema = z
  .string()
  .transform((value) => sanitizePlainText(value).toLowerCase())
  .pipe(
    z
      .string()
      .min(3, 'Username must be at least 3 characters.')
      .max(24, 'Username must be 24 characters or fewer.')
      .regex(
        /^[a-z0-9_]+$/,
        'Use lowercase letters, numbers, and underscores.',
      ),
  );

export const securePasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/[0-9]/, 'Include at least one number.')
  .regex(/[^a-zA-Z0-9]/, 'Include at least one symbol.');

export const avatarFileSchema = z
  .file()
  .max(5 * 1024 * 1024, 'Choose an image smaller than 5 MB.')
  .mime(
    ['image/jpeg', 'image/png', 'image/webp'],
    'Choose a JPG, PNG, or WebP image.',
  );

export const secureProfileTextSchema = z.string().transform(sanitizePlainText);
