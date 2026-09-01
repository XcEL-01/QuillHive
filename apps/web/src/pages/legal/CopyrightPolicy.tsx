import { brandName, legalEmail } from "@/lib/contact";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";

export function CopyrightPolicy() {
  const brand = brandName();
  const email = legalEmail();
  const t = useT();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("legal.copyright.title", "Copyright Policy")}</h1>
          <p className="text-muted-foreground text-sm">Effective May 2026 · Platform: {brand}</p>
        </div>

        <div className="space-y-10 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">1. Copyright Ownership</h2>
            <p className="mb-3 leading-relaxed">
              Creators on {brand} retain full copyright ownership of the original content they publish. Publishing on {brand} does not transfer copyright to the platform.
            </p>
            <p className="leading-relaxed">
              By publishing on {brand}, you grant a non-exclusive, royalty-free licence for the platform to display, distribute, and promote your content within the service and in platform marketing materials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">2. Platform Intellectual Property</h2>
            <p className="leading-relaxed">
              The {brand} name, logo, interface design, brand identity, and all platform-generated assets are the exclusive intellectual property of the platform owner. You may not reproduce, copy, modify, or claim ownership of any {brand} brand assets without explicit written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">3. Copyright Infringement</h2>
            <p className="mb-3 leading-relaxed">
              You must not publish content that infringes the copyright of others. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Reproducing substantial portions of another person's work without permission.</li>
              <li>Publishing copyrighted images, videos, or audio without a valid licence.</li>
              <li>Presenting others' work as your own (plagiarism).</li>
              <li>Removing copyright notices or attribution from content you republish.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">4. DMCA Takedown Process</h2>
            <p className="mb-3 leading-relaxed">
              If you believe your copyrighted work has been published on {brand} without authorisation, you may submit a DMCA takedown notice to:
            </p>
            <p className="mb-4 font-medium">
              <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>
            </p>
            <p className="mb-3 leading-relaxed">Your notice must include:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Identification of the copyrighted work you claim has been infringed.</li>
              <li>The URL of the allegedly infringing content on {brand}.</li>
              <li>Your contact information (name, address, email).</li>
              <li>A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or law.</li>
              <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">5. Counter-Notice</h2>
            <p className="leading-relaxed">
              If you believe your content was removed in error, you may submit a counter-notice to the same address. Counter-notices must include your name, address, a statement under penalty of perjury that you have a good-faith belief the content was removed in error, and your consent to the jurisdiction of a federal court in the applicable district.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">6. Repeat Infringers</h2>
            <p className="leading-relaxed">
              Accounts that repeatedly infringe copyright will be permanently suspended in accordance with our Terms of Service and applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">7. Contact</h2>
            <p className="leading-relaxed">
              Copyright enquiries: <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/content-policy" className="hover:text-foreground transition-colors">Content Policy</Link>
          <Link href="/community-guidelines" className="hover:text-foreground transition-colors">Community Guidelines</Link>
        </div>
      </div>
    </PublicLayout>
  );
}
