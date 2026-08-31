import { brandName, legalEmail } from "@/lib/contact";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";

export function Terms() {
  const brand = brandName();
  const email = legalEmail();
  const t = useT();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("legal.terms.title", "Terms of Service")}</h1>
          <p className="text-muted-foreground text-sm">Effective May 2026 · Platform: {brand}</p>
        </div>

        <div className="space-y-10 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">1. About {brand}</h2>
            <p className="mb-3 leading-relaxed">
              {brand} is a creator growth and opportunity platform. We help professional creators - writers, technical creators, educators, researchers, freelancers, and thinkers - build visible career identities, grow their audience, and convert that visibility into real-world opportunities.
            </p>
            <p className="leading-relaxed">
              {brand} is not a social media entertainment platform. It is a professional growth infrastructure for creators who take their craft seriously. By using {brand}, you agree to these Terms of Service in full.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">2. Eligibility</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>You must be at least 16 years of age to use {brand}.</li>
              <li>You must provide accurate registration information.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You may not create accounts on behalf of others without explicit authorisation.</li>
              <li>Accounts found to violate these terms may be suspended or permanently removed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">3. Creator Responsibility</h2>
            <p className="mb-3 leading-relaxed">
              <strong>You are solely responsible for all content you publish on {brand}.</strong> By posting content, you confirm that:
            </p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>You own the content or have all necessary rights and licences to publish it.</li>
              <li>Your content does not infringe the intellectual property, privacy, or legal rights of any third party.</li>
              <li>Your content does not contain illegal material, including but not limited to content that promotes violence, exploitation, harassment, discrimination, or illegal activity.</li>
              <li>You will not publish misinformation, spam, fraudulent content, or artificially generated content designed to deceive.</li>
              <li>You accept full legal liability for the content you publish.</li>
            </ul>
            <p className="mt-3 leading-relaxed">
              {brand} operates as a publishing platform. We do not pre-screen content. We reserve the right to remove any content that violates these terms without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">4. Intellectual Property</h2>
            <p className="mb-3 leading-relaxed">
              You retain full ownership of your original content. By publishing on {brand}, you grant us a non-exclusive, royalty-free, worldwide licence to display, distribute, and promote your content within the platform and in platform marketing, unless you explicitly remove your content.
            </p>
            <p className="leading-relaxed">
              The {brand} name, logo, design, and brand identity are the exclusive intellectual property of the platform owner. You may not reproduce, imitate, or claim ownership of any {brand} brand assets.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">5. Monetisation Policy</h2>
            <p className="mb-3 leading-relaxed">
              {brand} does not operate an ad-revenue or view-based creator payout system. Creators do not earn directly from views, watch time, ad revenue, or platform revenue sharing.
            </p>
            <p className="leading-relaxed">
              Creators earn through opportunities, commissions, collaborations, professional visibility, freelance contracts, and recruiter discovery facilitated through the platform. All paid features (Boosts, Spotlight, Featured Placement) are promotional tools, not income guarantee services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">6. Paid Services & Payments</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Boost, Spotlight, and Featured Placement purchases are non-refundable once activated.</li>
              <li>Payments are processed securely via Flutterwave. We do not store full payment card details.</li>
              <li>Boost activations are contingent on successful payment verification. Failed payments will not activate any boost.</li>
              <li>Duplicate payments are prevented. You may not game boost systems through repeated purchases.</li>
              <li>Promotional results (impressions, reach, recruiter views) are estimates and not guaranteed outcomes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">7. Prohibited Conduct</h2>
            <p className="mb-3 leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Post content that is illegal, harmful, defamatory, abusive, threatening, or fraudulent.</li>
              <li>Scrape, harvest, or extract data from the platform using automated means.</li>
              <li>Attempt to gain unauthorised access to other accounts, systems, or data.</li>
              <li>Abuse the reporting or support system through false or malicious submissions.</li>
              <li>Impersonate other creators, brands, or platform staff.</li>
              <li>Artificially inflate your engagement metrics, follower counts, or post performance.</li>
              <li>Distribute malware, phishing links, or malicious files through the platform.</li>
              <li>Violate applicable laws in your jurisdiction or the jurisdiction in which {brand} operates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">8. Moderation & Account Enforcement</h2>
            <p className="leading-relaxed">
              {brand} reserves the right to warn, restrict, suspend, or permanently terminate accounts that violate these terms. We may act without prior notice in cases of serious violations. Moderation decisions may be appealed through the support system. {brand} decisions on final account status are binding.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">9. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              {brand} is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted availability, accuracy of platform features, or specific outcomes from using platform services. Use {brand} at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">10. Limitation of Liability</h2>
            <p className="leading-relaxed">
              To the maximum extent permitted by law, {brand} and its owner shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the platform, content posted by other users, or any platform decisions including account enforcement actions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">11. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may update these Terms at any time. Continued use of {brand} after updates constitutes acceptance of the revised terms. We will notify users of material changes through the platform or by email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">12. Contact</h2>
            <p className="leading-relaxed">
              For legal enquiries or terms-related questions, contact us at:{" "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/content-policy" className="hover:text-foreground transition-colors">Content Policy</Link>
          <Link href="/community-guidelines" className="hover:text-foreground transition-colors">Community Guidelines</Link>
          <Link href="/copyright" className="hover:text-foreground transition-colors">Copyright Policy</Link>
        </div>
      </div>
    </AppLayout>
  );
}
