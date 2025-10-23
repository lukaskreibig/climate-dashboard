// app/components/I18nClient.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import i18n from "@/i18n/client";
import type { Language } from "@/i18n/settings";

interface Props {
  lng: Language;
  children: ReactNode;
}

export default function I18nClient({ lng, children }: Props) {
  useEffect(() => {
    if (i18n.language !== lng) {
      i18n.changeLanguage(lng);
    }
  }, [lng]);

  return <>{children}</>;
}
