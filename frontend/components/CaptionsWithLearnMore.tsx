"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StoryPhoto from '@/components/StoryPhoto';

interface LearnMoreData {
  title?: string;
  content?: string;
  image?: string;
  linkTitle: string;
  linkUrl?: string; 
}

interface CaptionWithLearnMoreProps {
  children: React.ReactNode;
  learnMore?: LearnMoreData;
}

/**
 * Splits a copy string into lines and turns bare URLs into links.
 *
 * It splits on BOTH forms of break, and the second one is not pedantry. This
 * used to split only on the literal two-character sequence backslash-n, and
 * the methods panel switches part way through to real newlines: 20 breaks
 * rendered, 28 did not. Everything from the archive link onwards, which is
 * every uncertainty caveat and both of its headings, arrived as one wall of
 * prose, because HTML collapses a real newline to a space. Either form is an
 * author asking for a paragraph, so either form gets one.
 */
const LINE_BREAK = /\\n|\r\n|\n/;

const renderWithLineBreaks = (content: string | undefined): React.ReactNode => {
  if (!content) return null;

  const urlRegex =
    /(https?:\/\/[^\s]+)/g; // simple 1-liner, good enough for docs

  const lines = content.split(LINE_BREAK);

  return lines.map((line, idx) => {
    // Replace each URL with an <a>
    const parts = line.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={`url-${idx}-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {part}
        </a>
      ) : (
        part
      ),
    );

    return (
      <React.Fragment key={idx}>
        {parts}
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

export const CaptionWithLearnMore: React.FC<CaptionWithLearnMoreProps> = ({
  children,
  learnMore
}) => {
  const { t } = useTranslation();
  
  // If no learnMore data, just render children as-is
  if (!learnMore || !learnMore.content) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost"
            size="sm" 
            className="mt-4 gap-2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()} // Prevent ScrollTrigger interference
          >
            <Info className="h-4 w-4" />
            {learnMore.linkTitle}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-full sm:w-[45vw] sm:max-w-none max-h-[80vh] overflow-y-auto text-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {learnMore.title || t('common.moreInformation', 'Weitere Informationen')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="prose prose-slate max-w-none text-base leading-relaxed space-y-4 !text-black">
              {learnMore.image && (
                <StoryPhoto
                  src={learnMore.image}
                  alt={learnMore.title || ''}
                  sizes="(max-width: 640px) 100vw, 45vw"
                  className="w-full h-auto rounded-lg mb-4"
                />
              )}
              {renderWithLineBreaks(learnMore.content)}
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter className="flex flex-col items-start !justify-between gap-2 mt-4">
            {learnMore.linkUrl && (
              <Button asChild variant="secondary">
                <a
                  href={learnMore.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('common.openSource', 'Originalquelle öffnen')}
                </a>
              </Button>
            )}
            <AlertDialogCancel className="hover:text-purple-700">
              {t('common.close')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Export helper for use in captions
export { renderWithLineBreaks };