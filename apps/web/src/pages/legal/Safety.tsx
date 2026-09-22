import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { BackButton } from "@/components/ui/BackButton";

export function Safety() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <BackButton />
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Stay safe on QuillHive</h1>
          <p className="text-muted-foreground text-sm">Practical guidance for Workspace opportunities</p>
        </div>

        <div className="space-y-10 text-foreground/90">
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="text-xl font-semibold mb-3 text-foreground">The short version</h2>
            <p className="leading-relaxed">
              Never pay a fee to apply for work. QuillHive helps people discover opportunities and
              connect with one another, but we do not process or hold payments made between users.
              Take time to verify who you are dealing with before sharing information, starting work,
              or sending money.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">What QuillHive does</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Provides profiles, job listings, service listings, and collaboration tools.</li>
              <li>Helps you discover people and opportunities based on the information members share.</li>
              <li>Provides ways to report suspicious listings, messages, or accounts for review.</li>
              <li>May restrict or remove content and accounts that violate our rules.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">What QuillHive does not protect against</h2>
            <p className="leading-relaxed mb-3">
              A profile or listing on QuillHive is not a guarantee that a person, business, job, rate,
              or payment promise is genuine. We do not:
            </p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Act as your employer or guarantee that a listing will result in paid work.</li>
              <li>Verify every employer, client, creator, job description, or payment promise.</li>
              <li>Process, hold, insure, or recover money exchanged between users.</li>
              <li>Guarantee the quality, safety, legality, or completion of work arranged by members.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Common freelance and job scams in Nigeria</h2>
            <p className="leading-relaxed mb-4">
              Scammers often use a convincing profile, urgent language, or an unusually attractive offer
              to make you act before you have time to check the details. Be cautious when you see:
            </p>
            <ul className="list-disc pl-6 space-y-3 leading-relaxed">
              <li>
                <strong>Upfront fees:</strong> requests for registration, training, clearance, equipment,
                transport, onboarding, or “unlocking” a job before you can start.
              </li>
              <li>
                <strong>Too-good-to-be-true rates:</strong> unusually high pay for simple work, especially
                when the description is vague or the client refuses normal questions.
              </li>
              <li>
                <strong>Pressure to move off-platform immediately:</strong> demands to continue on
                WhatsApp, Telegram, email, or another channel before any real work discussion or identity check.
              </li>
              <li>
                <strong>Early requests for bank details:</strong> requests for your account number, card
                details, PIN, OTP, password, or other financial information before the work and payment
                arrangement are clearly discussed.
              </li>
              <li>
                <strong>Urgency and secrecy:</strong> pressure to pay or share information immediately,
                instructions not to tell anyone, or threats that you will lose the opportunity if you ask questions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">How to protect yourself</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Check the person or business independently and ask clear questions about the work and deliverables.</li>
              <li>Agree on the scope, timeline, payment terms, and who pays any legitimate costs before starting.</li>
              <li>Do not share passwords, PINs, OTPs, card details, or identity documents through an unsolicited message.</li>
              <li>Keep records of messages, profiles, payment requests, phone numbers, and account details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">How to report something suspicious</h2>
            <p className="leading-relaxed">
              Use the <strong>Report</strong> action on a job or profile when it is available. For suspicious
              messages or problems that need more context, contact{" "}
              <Link href="/support" className="text-primary hover:underline">QuillHive Support</Link>.
              Include the listing or profile link and a short description of what happened. Do not send
              more money or information while you wait for a response. If you have already lost money or
              shared sensitive banking details, contact your bank immediately and report the incident to
              the appropriate local authorities.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/content-policy" className="hover:text-foreground transition-colors">Content Policy</Link>
        </div>
      </div>
    </PublicLayout>
  );
}