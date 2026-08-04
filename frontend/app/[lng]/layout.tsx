import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { languages, type Language } from '../../i18n/settings';
import { ThemeProvider } from '@/components/theme-provider';
import i18n from '../../i18n/server';          // 100 % React-frei
import I18nClient from '@/components/I18nClient';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/* Absolute base for canonical, hreflang and Open Graph URLs. Social crawlers
   reject relative image paths, so this has to resolve even at build time. Set
   NEXT_PUBLIC_SITE_URL per deployment; the default is the live Vercel host. */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://climate-dashboard-three.vercel.app';

const OG_IMAGE = '/images/og-cover.jpg';

const isLanguage = (value: string): value is Language =>
  (languages as readonly string[]).includes(value);

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

/* Without this the story shipped with no title, no description and no card at
   all: shared in a chat it appeared as a bare URL. Copy lives in the locale
   files so both languages stay in one place. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>;
}): Promise<Metadata> {
  const { lng } = await params;
  if (!isLanguage(lng)) return {};

  await i18n.changeLanguage(lng);
  const t = i18n.getFixedT(lng);
  const title = t('meta.title');
  const description = t('meta.description');

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: t('meta.siteName'),
    authors: [{ name: 'Lukas Kreibig' }],
    alternates: {
      canonical: `/${lng}`,
      languages: Object.fromEntries(languages.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: 'article',
      siteName: t('meta.siteName'),
      locale: lng === 'de' ? 'de_DE' : 'en_US',
      url: `/${lng}`,
      title,
      description,
      images: [
        { url: OG_IMAGE, width: 1200, height: 630, alt: t('meta.imageAlt') },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lng: Language }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { lng } = await params;
  // The segment is a catch-all, so /anything used to render the whole story
  // with lang="anything". Unknown segments are not a language, they are a 404.
  if (!isLanguage(lng)) notFound();
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
