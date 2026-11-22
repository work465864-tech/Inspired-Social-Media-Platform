import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { assertPermission } from '../../rbac/services/permissionService';
import { avatarFileSchema } from '../../security/schemas/securitySchemas';

const maximumImagePixels = 40_000_000;

async function validateImageSignature(file: File): Promise<void> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng =
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;
  const isJpeg =
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff;
  const isWebp =
    header.length >= 12 &&
    String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...header.slice(8, 12)) === 'WEBP';

  if (!isPng && !isJpeg && !isWebp) {
    throw new Error('The selected file is not a supported image.');
  }
}

async function compressAndCropAvatar(file: File): Promise<Blob> {
  const validation = avatarFileSchema.safeParse(file);
  if (!validation.success) {
    throw new Error(
      validation.error.issues[0]?.message ?? 'Choose a supported image.',
    );
  }
  await validateImageSignature(file);

  const image = await createImageBitmap(file);
  try {
    if (
      image.width > 8192 ||
      image.height > 8192 ||
      image.width * image.height > maximumImagePixels
    ) {
      throw new Error('Choose an image with dimensions below 40 megapixels.');
    }

    const cropSize = Math.min(image.width, image.height);
    const cropX = (image.width - cropSize) / 2;
    const cropY = (image.height - cropSize) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Your browser could not prepare the avatar image.');
    }
    context.drawImage(
      image,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Your browser could not compress the avatar.'));
          }
        },
        'image/webp',
        0.84,
      );
    });
  } finally {
    image.close();
  }
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ path: string; url: string }> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    throw new Error('A valid account is required to upload an avatar.');
  }
  await assertPermission('profiles:update:own');
  const compressedImage = await compressAndCropAvatar(file);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressedImage, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  return { path, url: publicUrl };
}

export async function removeAvatar(path: string): Promise<void> {
  await assertPermission('profiles:update:own');
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(path)) {
    throw new Error('The avatar path is invalid.');
  }
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from('avatars').remove([path]);
  if (error) {
    throw error;
  }
}
