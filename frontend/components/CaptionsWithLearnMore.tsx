// components/CaptionWithLearnMore.tsx
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

// Helper function to render content with line breaks
// Helper: split lines AND convert http/https to <a>.
const renderWithLineBreaks = (content: string | undefined): React.ReactNode => {
  if (!content) return null;

  const urlRegex =
    /(https?:\/\/[^\s]+)/g; // simple 1-liner – good enough for docs

  return content.split('\\n').map((line, idx) => {
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
        {idx < content.split('\\n').length - 1 && <br />}
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
       <div
        className="inline-block pointer-events-auto"
        /* ScrollTrigger klick-Durchleitung verhindern: */
        onClick={(e) => e.stopPropagation()}
      ></div>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost"
            size="sm" 
            className="mt-2 gap-2"
          >
            <Info className="h-4 w-4" />
            {learnMore.linkTitle}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="w-[45vw] sm:max-w-none max-h-[80vh] overflow-y-auto text-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {learnMore.title || t('common.moreInformation', 'Weitere Informationen')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
  <div className="prose prose-slate max-w-none text-base leading-relaxed space-y-4 !text-black">
            {learnMore.image && (
              <img 
                src={learnMore.image} 
                alt={learnMore.title || ''}
                className="w-full rounded-lg mb-4"
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