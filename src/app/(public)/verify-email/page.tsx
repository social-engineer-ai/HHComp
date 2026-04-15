import { Suspense } from "react";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
