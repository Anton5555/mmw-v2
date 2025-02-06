import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/env';

export const getS3Client = () => {
  const { STORAGE_ENDPOINT, REGION, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY } =
    env;

  return new S3Client({
    forcePathStyle: true,
    endpoint: STORAGE_ENDPOINT,
    region: REGION,
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY as string,
      secretAccessKey: STORAGE_SECRET_KEY as string,
    },
  });
};

type UploadFileProps = {
  file: File;
  key: string;
  bucket: string;
};

export const uploadFile = async ({ file, key, bucket }: UploadFileProps) => {
  const client = getS3Client();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    ACL: 'public-read',
  });

  return client.send(command);
};

type DeleteFileProps = {
  key: string;
  bucket: string;
};

export const deleteFile = async ({ key, bucket }: DeleteFileProps) => {
  try {
    const client = getS3Client();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(
      `Failed to delete file ${key}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};
