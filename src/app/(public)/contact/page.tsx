import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <>
      <PublicHeader />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Ask a question</h1>
        <p className="mt-2 text-neutral-600">
          Have a question about the competition, eligibility, or the submission process?
          Send us a message and we'll get back to you.
        </p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
