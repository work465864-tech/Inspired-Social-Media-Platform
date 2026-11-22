import { z } from 'zod';
import {
  secureUsernameSchema,
  secureProfileTextSchema,
} from '../../security/schemas/securitySchemas';

export const profileUsernameSchema = secureUsernameSchema;

export const profileUpdateSchema = z.object({
  username: profileUsernameSchema,
  full_name: secureProfileTextSchema.pipe(
    z
      .string()
      .min(1, 'Enter your full name.')
      .max(80, 'Full name must be 80 characters or fewer.'),
  ),
  avatar_url: z
    .string()
    .url('Enter a valid avatar URL.')
    .refine((value) => {
      const { protocol, hostname } = new URL(value);
      return (
        protocol === 'https:' ||
        (protocol === 'http:' &&
          (hostname === 'localhost' || hostname === '127.0.0.1'))
      );
    }, 'Avatar URLs must use HTTPS.')
    .nullable(),
  bio: secureProfileTextSchema.pipe(
    z.string().max(160, 'Bio must be 160 characters or fewer.'),
  ),
  is_private: z.boolean(),
});
