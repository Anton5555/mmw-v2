import { headers } from 'next/headers';
import { ProfileFormValues } from '../validations/users';
import { prisma } from '@/lib/db';
import { auth } from '../auth';
import { deleteFile, uploadFile } from '../utils/s3';
import { env } from '@/env';
import { v4 as uuidv4 } from 'uuid';

export const updateUser = async (data: ProfileFormValues) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error('No session found');

  const userId = session.user.id;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!currentUser) throw new Error('User not found');

  let imageUrl = currentUser.image;

  if (data.image instanceof File) {
    const fileExtension = data.image.name.split('.').pop();
    const newImageKey = `${uuidv4()}.${fileExtension}`;
    const newImageUrl = `${env.STORAGE_PUBLIC_URL}/users/${newImageKey}`;

    await uploadFile({
      file: data.image,
      key: newImageKey,
      bucket: 'users',
    });

    if (currentUser.image) {
      const oldImageKey = currentUser.image.replace(
        `${env.STORAGE_PUBLIC_URL}/users/`,
        ''
      );

      await deleteFile({
        key: oldImageKey,
        bucket: 'users',
      });
    }

    imageUrl = newImageUrl;
  }

  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      image: imageUrl,
    },
  });

  return result;
};
