import { PublicLayout } from "@/components/layout/PublicLayout";
import { dmcaEmail as dmcaEmailGetter, appealsEmail as appealsEmailGetter } from "@/lib/contact";
import { useT } from "@/lib/i18n";
import { BackButton } from "@/components/ui/BackButton";

export function ContentPolicy() {
  const dmcaEmail = dmcaEmailGetter();
  const appealsEmail = appealsEmailGetter();
  const t = useT();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <BackButton />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t("legal.policy.title", "Content Policy")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t("legal.effective", "Effective April 2026")}</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">{t("legal.policy.what", "What QuillHive Is")}</h2>
            <p className="text-gray-700 dark:text-gray-300">
              QuillHive is a creative platform for original writing, poetry, illustration, and art.
              We exist to give creators a respectful, focused space to share, connect, and grow.
              We expect every member to contribute in a way that keeps that space safe and useful for everyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t("legal.policy.prohibited", "Prohibited Content")}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              The following content is not allowed on QuillHive under any circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>Hate speech</strong> targeting race, ethnicity, religion, gender, sexuality,
                disability, or nationality.
              </li>
              <li>
                <strong>Content that sexualizes minors</strong> in any form - zero tolerance, immediate
                permanent ban, and reporting to authorities where required by law.
              </li>
              <li>
                <strong>Plagiarism</strong> - posting another person's work without credit or permission.
              </li>
              <li>
                <strong>Doxxing</strong> - sharing private personal information about another person without
                their consent.
              </li>
              <li>
                <strong>Threats or incitement to violence</strong> against any person or group.
              </li>
              <li>
                <strong>Spam, bot-generated content, or coordinated inauthentic behavior.</strong>
              </li>
              <li>
                <strong>Illegal content</strong>, including copyright-infringing material posted without
                permission.
              </li>
              <li>
                <strong>Impersonation</strong> of real people or other creators.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t("legal.policy.dmca", "DMCA & Copyright")}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              The DMCA (Digital Millennium Copyright Act) is the law that lets copyright owners ask for
              their work to be removed when it's been posted somewhere without their permission. In plain
              terms: if someone takes your poem, story, or illustration and uploads it here without your
              consent, you can ask us to take it down.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              QuillHive responds to valid DMCA takedown notices. To submit a request, email{' '}
              <a href={`mailto:${dmcaEmail}`} className="text-primary underline">{dmcaEmail}</a> with:
            </p>
            <ol className="list-decimal pl-6 text-gray-700 dark:text-gray-300 space-y-1">
              <li>Identification of the copyrighted work that has been infringed.</li>
              <li>The URL of the infringing content on QuillHive.</li>
              <li>Your contact information and a statement of good faith.</li>
              <li>An electronic or physical signature.</li>
            </ol>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              A counter-notice process is available for users whose content was removed by mistake or in
              error. We may temporarily restore content if a valid counter-notice is received.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t("legal.policy.appeals", "Appeals Process")}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              If you believe your content was removed or your account was banned in error, you can submit
              an appeal by emailing{' '}
              <a href={`mailto:${appealsEmail}`} className="text-primary underline">{appealsEmail}</a>{' '}
              within 30 days of the action. Include your username and a clear explanation of why you
              believe the decision was incorrect.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              We review all appeals within 7 business days. Decisions made by a super_admin on appeal
              are final.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t("legal.policy.enforcement", "Enforcement")}</h2>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>First violation:</strong> warning and removal of the offending content.
              </li>
              <li>
                <strong>Second violation:</strong> temporary suspension (7 days) and content removal.
              </li>
              <li>
                <strong>Severe violations</strong> (CSAM, credible threats, doxxing, repeated copyright
                abuse): immediate permanent ban without appeal.
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              Our trust system tracks behavior over time and informs enforcement decisions alongside
              human review and AI-assisted flagging.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t("legal.policy.reporting", "Reporting")}</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Anyone can report a post, comment, or user that appears to violate these rules using the
              in-app report tool. Reports go to our moderation team and may also be flagged automatically
              by our AI moderation assistant for faster review.
            </p>
          </section>

          <p className="text-sm text-gray-500 dark:text-gray-400 pt-8 border-t border-border">
            Last updated: April 2026
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export default ContentPolicy;
