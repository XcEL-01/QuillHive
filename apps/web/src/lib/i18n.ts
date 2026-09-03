import { create } from 'zustand';

export const SUPPORTED_LANGS = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  { code: 'es', name: 'Español', dir: 'ltr' as const },
  { code: 'ar', name: 'العربية', dir: 'rtl' as const },
  { code: 'fr', name: 'Français', dir: 'ltr' as const },
  { code: 'de', name: 'Deutsch', dir: 'ltr' as const },
  { code: 'pt', name: 'Português', dir: 'ltr' as const },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' as const },
  { code: 'zh', name: '中文', dir: 'ltr' as const },
  { code: 'ja', name: '日本語', dir: 'ltr' as const },
  { code: 'ko', name: '한국어', dir: 'ltr' as const },
];

const RTL_LANGS = ['ar'];
const STORAGE_KEY = 'qh_lang';
const DEFAULT_LANG = 'en';

type Translations = Record<string, unknown>;

function getNestedValue(obj: Translations, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

async function loadLocale(lang: string): Promise<Translations> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`/locales/${lang}.json?v=${Date.now()}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to load locale ${lang}`);
    return await res.json() as Translations;
  } catch {
    if (lang !== DEFAULT_LANG) {
      return loadLocale(DEFAULT_LANG);
    }
    return {};
  } finally {
    window.clearTimeout(timeout);
  }
}

function detectBrowserLang(): string {
  const supported = SUPPORTED_LANGS.map(l => l.code);
  const nav = navigator.language || navigator.languages?.[0] || DEFAULT_LANG;
  const code = nav.split('-')[0].toLowerCase();
  return supported.includes(code) ? code : DEFAULT_LANG;
}

function detectStoredLang(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.some(l => l.code === stored)) return stored;
  } catch {
    /* ignore */
  }
  return detectBrowserLang();
}

function applyDocumentDir(lang: string) {
  const isRTL = RTL_LANGS.includes(lang);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

function mergeTranslations(base: Translations, localized: Translations): Translations {
  const result: Translations = { ...localized };
  for (const [key, value] of Object.entries(base)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const child = result[key];
      result[key] = mergeTranslations(
        value as Translations,
        child && typeof child === "object" && !Array.isArray(child) ? child as Translations : {},
      );
    } else if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

export interface I18nStore {
  lang: string;
  dir: 'ltr' | 'rtl';
  translations: Translations;
  fallbackTranslations: Translations;
  isLoaded: boolean;
  setLang: (lang: string, saveToBackend?: boolean) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  init: () => Promise<void>;
}

let fallbackCache: Translations = {};

export const useI18n = create<I18nStore>((set, get) => ({
  lang: DEFAULT_LANG,
  dir: 'ltr',
  translations: {},
  fallbackTranslations: {},
  isLoaded: false,

  t: (key: string, fallback?: string): string => {
    const { translations, fallbackTranslations } = get();
    return (
      getNestedValue(translations, key) ??
      getNestedValue(fallbackTranslations, key) ??
      fallback ??
      key
    );
  },

  setLang: async (lang: string, saveToBackend = false) => {
    const validLang = SUPPORTED_LANGS.some(l => l.code === lang) ? lang : DEFAULT_LANG;
    const isRTL = RTL_LANGS.includes(validLang);
    const dir = isRTL ? 'rtl' : 'ltr';

    const translations = validLang === DEFAULT_LANG
      ? fallbackCache
      : mergeTranslations(fallbackCache, await loadLocale(validLang));

    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch {
      /* ignore */
    }

    applyDocumentDir(validLang);
    set({ lang: validLang, dir, translations, isLoaded: true });

    if (saveToBackend) {
      try {
        const token = localStorage.getItem('qh_token') || sessionStorage.getItem('qh_token');
        if (token) {
          await fetch('/api/user/language', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lang: validLang }),
          });
        }
      } catch {
        /* ignore */
      }
    }
  },

  init: async () => {
    if (!fallbackCache || Object.keys(fallbackCache).length === 0) {
      fallbackCache = await loadLocale(DEFAULT_LANG);
    }

    const detectedLang = detectStoredLang();
    const isRTL = RTL_LANGS.includes(detectedLang);
    const dir = isRTL ? 'rtl' : 'ltr';

    const translations = detectedLang === DEFAULT_LANG
      ? fallbackCache
      : mergeTranslations(fallbackCache, await loadLocale(detectedLang));

    applyDocumentDir(detectedLang);
    set({
      lang: detectedLang,
      dir,
      translations,
      fallbackTranslations: fallbackCache,
      isLoaded: true,
    });
  },
}));

export function useT() {
  return useI18n(state => state.t);
}

export function useLang() {
  return useI18n(state => state.lang);
}

export function useDir() {
  return useI18n(state => state.dir);
}

export function isRTL(lang: string): boolean {
  return RTL_LANGS.includes(lang);
}

export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) return 'en';

  const arabicPattern = /[\u0600-\u06FF]/;
  const chinesePattern = /[\u4E00-\u9FFF]/;
  const japanesePattern = /[\u3040-\u30FF]/;
  const koreanPattern = /[\uAC00-\uD7AF]/;
  const devanagariPattern = /[\u0900-\u097F]/;

  if (arabicPattern.test(text)) return 'ar';
  if (japanesePattern.test(text)) return 'ja';
  if (koreanPattern.test(text)) return 'ko';
  if (chinesePattern.test(text)) return 'zh';
  if (devanagariPattern.test(text)) return 'hi';

  const lower = text.toLowerCase();
  const germanWords = /\b(und|der|die|das|ist|ich|nicht|mit|von|zu|den|für|auf|in|es|ein)\b/g;
  const frenchWords = /\b(le|la|les|un|une|des|est|et|en|que|qui|dans|ce|je|il|pas|au|du)\b/g;
  const spanishWords = /\b(el|la|los|las|un|una|es|en|que|de|y|se|del|por|con|no|una|su|para)\b/g;
  const portugueseWords = /\b(o|a|os|as|um|uma|é|em|que|de|e|se|do|da|por|com|não|sua|para)\b/g;

  const scores: Record<string, number> = {
    de: (lower.match(germanWords) || []).length,
    fr: (lower.match(frenchWords) || []).length,
    es: (lower.match(spanishWords) || []).length,
    pt: (lower.match(portugueseWords) || []).length,
  };

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 2) return best[0];

  return 'en';
}
