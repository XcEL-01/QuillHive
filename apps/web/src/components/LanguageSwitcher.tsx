import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGS, useI18n, useLang, useT } from "@/lib/i18n";

interface LanguageSwitcherProps {
  variant?: "button" | "ghost" | "inline";
  saveToBackend?: boolean;
  align?: "start" | "center" | "end";
}

export function LanguageSwitcher({ variant = "ghost", saveToBackend = false, align = "end" }: LanguageSwitcherProps) {
  const lang = useLang();
  const t = useT();
  const setLang = useI18n((s) => s.setLang);
  const current = SUPPORTED_LANGS.find((l) => l.code === lang) ?? SUPPORTED_LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "button" ? "outline" : "ghost"}
          size={variant === "inline" ? "sm" : "icon"}
          className={variant === "inline" ? "h-8 px-2 gap-1.5 rounded-full" : "rounded-full"}
          aria-label={t('settings.selectLanguage')}
          data-testid="button-language-switcher"
        >
          <Globe className="w-4 h-4" />
          {variant === "inline" && <span className="text-xs font-medium">{current.code.toUpperCase()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48 rounded-2xl">
        <DropdownMenuLabel className="text-xs">{t('settings.language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => { void setLang(l.code, saveToBackend); }}
            className="cursor-pointer flex items-center justify-between"
            data-testid={`option-lang-${l.code}`}
          >
            <span dir={l.dir}>{l.name}</span>
            {l.code === lang && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
