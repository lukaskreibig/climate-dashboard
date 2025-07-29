// app/components/I18nClient.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import i18n from "@/i18n/client";

export default function I18nClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lng = pathname.split("/")[1] || "en";

  useEffect(() => {
    // nur ändern, falls wirklich nötig
    console.log("I18nClient rerender?", lng);
    if (i18n.language !== lng) {
      i18n.changeLanguage(lng);       // löst re-render sauber im Effekt aus
    }
  }, [lng]);

  return <>{children}</>;
}
