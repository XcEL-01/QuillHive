import { Link } from 'wouter';
import { useT } from "@/lib/i18n";
import {
  Twitter,
  Github,
  Instagram,
  Heart,
  Feather,
  BookOpen,
  Shield,
  Globe
} from 'lucide-react';

export function Footer() {
  const t = useT();

  return (
    <footer className="border-t border-border/60 bg-card/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Feather className="w-6 h-6 text-primary" />
              <span className="font-serif text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                QuillHive
              </span>
            </div>
            <p className="leading-relaxed">
              <span className="italic font-medium">
                "Your quill is your voice. Your hive is where it grows."
              </span>
              <br />
              <span className="text-muted-foreground text-sm">
                Grow, get discovered, and find real opportunities - for everyone.
              </span>
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://x.com/quillhive" target="_blank" rel="noreferrer" aria-label="QuillHive on X" className="p-2 rounded-full bg-muted/50 hover:bg-primary/10 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/quillhive" target="_blank" rel="noreferrer" aria-label="QuillHive on Instagram" className="p-2 rounded-full bg-muted/50 hover:bg-primary/10 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://github.com/quillhive" target="_blank" rel="noreferrer" aria-label="QuillHive on GitHub" className="p-2 rounded-full bg-muted/50 hover:bg-primary/10 transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              {t("footer.platform", "Platform")}
                </h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.aboutUs", "About")}</Link></li>
              <li><Link href="/explore" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.explore", "Explore")}</Link></li>
              <li><Link href="/library" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.library", "Library")}</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              {t("footer.resources", "Resources")}
            </h3>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.helpCenter", "Help Center")}</Link></li>
              <li><Link href="/community-guidelines" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.communityGuidelines", "Community Guidelines")}</Link></li>
              <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.contactUs", "Contact & Support")}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              {t("footer.legal", "Legal")}
            </h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.terms", "Terms of Service")}</Link></li>
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.privacy", "Privacy Policy")}</Link></li>
              <li><Link href="/content-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.contentPolicy", "Content Policy")}</Link></li>
              <li><Link href="/copyright" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer.copyright", "Copyright Policy")}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/40 pt-6 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © 2025 QuillHive. All rights reserved.
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>{t("footer.madeWith", "Made with")}</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span>{t("footer.forWriters", "for everyone")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
