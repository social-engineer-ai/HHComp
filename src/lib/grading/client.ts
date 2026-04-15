type GradeInput = {
  submissionS3Key: string;
  answerKeyS3Key: string;
  scriptS3Key?: string | null;
};

type GradeResponse = {
  ok: boolean;
  score?: number;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  error?: string;
};

export async function callGrader(input: GradeInput): Promise<GradeResponse> {
  const url = process.env.GRADER_URL ?? "http://grader:8000";
  const secret = process.env.GRADER_SHARED_SECRET ?? "";

  const res = await fetch(`${url}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      submission_s3_key: input.submissionS3Key,
      answer_key_s3_key: input.answerKeyS3Key,
      script_s3_key: input.scriptS3Key ?? null,
      shared_secret: secret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Grader HTTP ${res.status}: ${text}` };
  }
  return (await res.json()) as GradeResponse;
}
