import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  NDA_HASH_SALT: z.string().min(8),

  AWS_REGION: z.string().default("us-east-2"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_SENDER_ADDRESS: z.string().email(),
  GMAIL_SENDER_NAME: z.string().default("Gies Supply Chain Case Competition"),

  GRADER_URL: z.string().url().optional(),
  GRADER_SHARED_SECRET: z.string().optional(),

  COMPETITION_DEADLINE_ISO: z.string(),
  COMPETITION_GRACE_END_ISO: z.string(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  cached = parsed.data;
  return cached;
}
