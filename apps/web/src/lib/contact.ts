const fallbackHost = (() => {
  if (typeof window === "undefined") return "quillhive.app";
  const h = window.location.hostname || "quillhive.app";
  return h.replace(/^www\./, "");
})();

function envEmail(key: string, localPart: string): string {
  const fromEnv = (import.meta.env[key] as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  return `${localPart}@${fallbackHost}`;
}

export const supportEmail = (): string => envEmail("VITE_SUPPORT_EMAIL", "support");
export const privacyEmail = (): string => envEmail("VITE_PRIVACY_EMAIL", "privacy");
export const legalEmail = (): string => envEmail("VITE_LEGAL_EMAIL", "legal");
export const contactEmail = (): string => envEmail("VITE_CONTACT_EMAIL", "hello");
export const dmcaEmail = (): string => envEmail("VITE_DMCA_EMAIL", "dmca");
export const appealsEmail = (): string => envEmail("VITE_APPEALS_EMAIL", "appeals");

export const brandName = (): string =>
  (import.meta.env.VITE_BRAND_NAME as string | undefined)?.trim() || "QuillHive";
