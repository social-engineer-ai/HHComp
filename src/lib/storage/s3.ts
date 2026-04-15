import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID } from "node:crypto";

const REGION = process.env.AWS_REGION ?? "us-east-2";
const BUCKET = process.env.S3_BUCKET ?? "";

let cached: S3Client | null = null;
function getClient(): S3Client {
  if (cached) return cached;
  // On EC2, this picks up credentials from the instance profile automatically.
  // Locally, it reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from env.
  cached = new S3Client({ region: REGION });
  return cached;
}

export type PutInput = {
  key?: string;
  prefix?: string;
  filename: string;
  contentType: string;
  body: Buffer | Uint8Array;
};

export type PutResult = {
  key: string;
  sha256: string;
  fileSize: number;
};

export async function putObject(input: PutInput): Promise<PutResult> {
  if (!BUCKET) throw new Error("S3_BUCKET is not configured");
  const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
  const sha256 = createHash("sha256").update(body).digest("hex");
  const key =
    input.key ??
    `${input.prefix ?? "misc"}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName(input.filename)}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: input.contentType,
      Metadata: { sha256, originalFilename: safeName(input.filename) },
      ServerSideEncryption: "AES256",
    })
  );
  return { key, sha256, fileSize: body.byteLength };
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 150);
}

export async function getPresignedDownloadUrl(
  key: string,
  ttlSeconds = 300,
  downloadFilename?: string
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: downloadFilename
      ? `attachment; filename="${downloadFilename}"`
      : undefined,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: ttlSeconds });
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  const stream = res.Body as NodeJS.ReadableStream;
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array);
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}
