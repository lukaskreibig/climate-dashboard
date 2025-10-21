"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Globe, Check } from "lucide-react";
import clsx from "clsx";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
] as const;

// const languages = [
//   { code: "en", name: "English" },
//   { code: "de", name: "Deutsch"},
// ] as const;

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = pathname.split("/")[1] || "en";

  const switchTo = (lng: string) => {
    /* Cookie setzen – 1 Jahr gültig */
    document.cookie = `NEXT_LOCALE=${lng};path=/;max-age=${60 * 60 * 24 * 365}`;
    const parts = pathname.split("/");
    parts[1] = lng;
    router.push(parts.join("/"));
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="fixed bottom-18 right-5.5 z-40 flex items-center gap-2 rounded-full bg-white/80
                     px-3.5 py-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur
                     transition-all hover:bg-white hover:scale-105"
          aria-label="Sprache ändern"
        >
          {/* <Globe className="h-4 w-4 text-slate-700" /> */}
          <span className="text-sm font-medium text-slate-700">
             {current.toUpperCase()}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-[999] w-48 rounded-xl bg-white/95 p-2 text-sm
                     text-slate-900 shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-1">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => switchTo(lang.code)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2",
                  "transition-colors hover:bg-slate-100",
                  current === lang.code && "bg-slate-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
                {current === lang.code && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
          <Popover.Arrow className="fill-white/95" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
