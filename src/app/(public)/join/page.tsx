import { Suspense } from "react";
import { JoinForm } from "./JoinForm";

export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
