import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, isRtl } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const setLang = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = isRtl(lng) ? 'rtl' : 'ltr';
  };

  return (
    <div className={cn('flex gap-1', className)}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <Button
          key={lng}
          type="button"
          variant={current === lng ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setLang(lng)}
        >
          {lng === 'ar' ? 'ع' : 'EN'}
        </Button>
      ))}
    </div>
  );
}
