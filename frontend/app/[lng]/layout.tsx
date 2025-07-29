import type { Language } from '../../i18n/settings';
import { ThemeProvider } from '@/components/theme-provider';
import i18n from '../../i18n/server';          // 100 % React-frei
import I18nClient from '@/components/I18nClient';
import LanguageSwitcher from '@/components/LanguageSwitcher';


export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lng: Language };
}) {
  const { lng } = await params;
  await i18n.changeLanguage(lng);              // Server stellt Sprache ein

  return (
    <html lang={lng} className="scroll-smooth dark" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <I18nClient lng={lng}>{children}</I18nClient>
           <LanguageSwitcher />
        </ThemeProvider>
      </body>
    </html>
  );
}
