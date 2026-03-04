import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export function getFounderBucketName(founderId: string): string {
  const prefix = process.env.S3_BUCKET_PREFIX ?? 'zero2exit-founder-'
  return `${prefix}${founderId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

export async function provisionFounderBucket(founderId: string): Promise<string> {
  const bucketName = getFounderBucketName(founderId)

  try {
    // Create the bucket
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }))

    // Block all public access
    await s3.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      }),
    )

    console.log(`S3 bucket provisioned: ${bucketName}`)
  } catch (err: unknown) {
    // Bucket may already exist — that is fine
    const code =
      (err as { Code?: string; name?: string }).Code ??
      (err as { name?: string }).name
    if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
      console.error(`Failed to provision S3 bucket ${bucketName}:`, err)
      // Do not throw — founder record creation should not fail due to S3
    }
  }

  return bucketName
}

export async function getSignedDownloadUrl(
  bucketName: string,
  key: string,
  expiresInSeconds = 900, // 15 minutes
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}

export async function getSignedUploadUrl(
  bucketName: string,
  key: string,
  expiresInSeconds = 900,
): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucketName, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}

