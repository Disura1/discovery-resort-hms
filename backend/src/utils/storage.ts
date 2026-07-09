import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3";
import { env } from "../config/env";

const PUT_URL_TTL_SECONDS = 5 * 60;   // long enough for a slow upload to start
const GET_URL_TTL_SECONDS = 5 * 60;   // short-lived; re-requested each time a private file is viewed

export async function getPresignedPutUrl(key: string, mimeType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: mimeType
  });
  return getSignedUrl(s3Client, command, { expiresIn: PUT_URL_TTL_SECONDS });
}

export async function getPresignedGetUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: GET_URL_TTL_SECONDS });
}

export function getPublicUrl(key: string): string {
  return `${env.S3_PUBLIC_BASE_URL}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

/** Confirms the object actually landed in the bucket before we trust client-reported metadata. */
export async function headObject(key: string) {
  const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
  return s3Client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}