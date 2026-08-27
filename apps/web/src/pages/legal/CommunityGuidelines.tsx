import { brandName, legalEmail } from "@/lib/contact";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";

export function CommunityGuidelines() {
  const brand = brandName();
  const email = legalEmail();
  const t = useT();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("legal.guidelines.title", "Community Guidelines")}</h1>
          <p className="text-muted-foreground text-sm">Effective May 2026 · Platform: {brand}</p>
          <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
            {brand} is built for everyone who wants to grow, get discovered, and find real opportunities. These guidelines protect that mission and the community that makes it possible.
          </p>
        </div>

        <div className="space-y-10 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">1. Create With Purpose</h2>
            <p className="mb-3 leading-relaxed">
              {brand} is a platform for creators who are building something real. We encourage:
            </p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Original writing, technical content, creative work, research, and professional insights.</li>
              <li>Thoughtful sparks, behind-the-scenes updates, and creator momentum posts.</li>
              <li>Long-form stories, essays, and immersive creative work.</li>
              <li>Collaborative engagement — meaningful comments, respectful debate, and constructive feedback.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">2. Content Standards</h2>
            <p className="mb-3 leading-relaxed">All content on {brand} must:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Be original or properly attributed where it builds on others' work.</li>
              <li>Respect the intellectual property rights of others.</li>
              <li>Meet basic quality standards — we are a professional platform, not a dump for AI-generated spam.</li>
              <li>Be accurate when presenting factual claims. Do not publish deliberate misinformation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">3. Prohibited Content</h2>
            <p className="mb-3 leading-relaxed">The following content is strictly prohibited:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Hate speech, discrimination, or content targeting individuals based on race, religion, gender, sexuality, disability, or national origin.</li>
              <li>Harassment, threats, doxxing, or targeted abuse toward any individual or group.</li>
              <li>Sexual content involving minors, in any form.</li>
              <li>Violent, graphic, or disturbing content shared without clear creative or educational purpose.</li>
              <li>Illegal content including content promoting drug trafficking, fraud, or criminal activity.</li>
              <li>Spam — mass-posting low-quality content, cross-posting identical content, or using the platform for unsolicited promotions.</li>
              <li>Phishing, malware, or content designed to deceive or defraud other users.</li>
              <li>Impersonation of other creators, brands, or {brand} staff.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">4. Respectful Interaction</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Engage with others' work constructively. Critique ideas, not people.</li>
              <li>Disagreement is welcome. Personal attacks are not.</li>
              <li>Do not weaponise the report system against creators you disagree with. False reports are a violation of these guidelines.</li>
              <li>Respect that {brand} creators are building careers. Treat their work accordingly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">5. Authenticity</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Be honest about who you are. Fake profiles, fake credentials, and misleading identity claims are prohibited.</li>
              <li>Do not artificially inflate your engagement metrics, follower counts, or content reach.</li>
              <li>Disclose clearly when content is AI-assisted or AI-generated. Passing AI output as entirely original work is a violation of platform authenticity standards.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">6. Professional Conduct</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Opportunities, collaboration requests, and professional connections should be approached with genuine intent.</li>
              <li>Do not use {brand} to solicit personal payments, pitch pyramid schemes, or recruit for fraudulent opportunities.</li>
              <li>Paid Boost and Spotlight placements must represent genuine creator work, not spam or low-quality content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">7. Enforcement</h2>
            <p className="leading-relaxed">
              Violations of these guidelines may result in content removal, account warnings, temporary restrictions, or permanent bans depending on severity and history. We investigate all credible reports. Decisions may be appealed through the support system. {brand} reserves final authority on enforcement decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">8. Report Violations</h2>
            <p className="leading-relaxed">
              Use the report feature on any post, comment, or profile to flag potential violations. For urgent or serious concerns, contact us at{" "}
              <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/content-policy" className="hover:text-foreground transition-colors">Content Policy</Link>
          <Link href="/copyright" className="hover:text-foreground transition-colors">Copyright Policy</Link>
        </div>
      </div>
    </AppLayout>
  );
}
