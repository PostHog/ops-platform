import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const S3_BUCKET = process.env.AWS_BUCKET_NAME!

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600, // 1 hour default
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600, // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

export function generateFileKey(
  programId: string,
  checklistItemId: string,
  fileName: string,
): string {
  // Sanitize fileName to avoid path issues
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = Date.now()
  return `performance-programs/${programId}/${checklistItemId}/${timestamp}-${sanitizedFileName}`
}
