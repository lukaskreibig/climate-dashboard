/* ------------------------------------------------------------------
   components/LegalFooter.tsx
------------------------------------------------------------------ */
"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog  from "@radix-ui/react-dialog";
import { Info, X }  from "lucide-react";
import clsx         from "clsx";
import { useTranslation } from "react-i18next";

/* ---------- Button + Popover ---------------------------------- */
export default function LegalFooter() {
  const { t } = useTranslation();
  const [openDoc, setOpenDoc] = useState<"impressum" | "dse" | null>(null);

  return (
    <>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            aria-label={t('legal.info')}
            className="fixed bottom-6 right-5.5 z-[999] rounded-full bg-white/80
                       p-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur
                       transition-colors hover:bg-white hover:scale-105"
          >
            <Info className="h-5 w-5 text-slate-700" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={12}
            className="z-[999] w-50 rounded-xl bg-white/90 p-4 mr-4 text-sm
                       text-slate-900 shadow-2xl backdrop-blur-xl"
          >
            <p className="mb-2 font-semibold">{t('legal.title')}</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <button
                  onClick={() => setOpenDoc("impressum")}
                  className="underline hover:text-sky-700"
                >
                  {t('legal.imprintLink')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setOpenDoc("dse")}
                  className="underline hover:text-sky-700"
                >
                  {t('legal.privacyLink')}
                </button>
              </li>
            </ul>
            <Popover.Arrow className="fill-white/90 ml-4" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* ---------- Dialog (wird abhängig von openDoc angezeigt) */}
      <LegalDialog
        type={openDoc}
        onClose={() => setOpenDoc(null)}
      />
    </>
  );
}

/* ============================================================= */
/* ---------------------   Dialog-Wrapper   --------------------- */
interface LegalDialogProps {
  type: "impressum" | "dse" | null;
  onClose: () => void;
}

function LegalDialog({ type, onClose }: LegalDialogProps) {
  const { t } = useTranslation();
  const title =
    type === "impressum" ? t('legal.imprintLink')
    : type === "dse"      ? t('legal.privacyLink')
    : "";

  return (
    <Dialog.Root open={!!type} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm animate-fadeIn" />

        <Dialog.Content
          className={clsx(
            "fixed left-1/2 top-1/2 z-[999] w-[90vw] max-w-2xl max-h-[80vh]",
            "-translate-x-1/2 -translate-y-1/2 rounded-2xl text-black bg-white/95 p-6",
            "shadow-2xl backdrop-blur-xl overflow-y-auto animate-popIn"
          )}
        >
          <Dialog.Title className="mb-4 text-2xl font-bold text-slate-900">
            {title}
          </Dialog.Title>

          {type === "impressum" && <Impressum />}
          {type === "dse"        && <Datenschutz />}

          <Dialog.Close asChild>
            <button
              aria-label={t('legal.close')}
              className="absolute top-4 right-4 inline-flex h-8 w-8 items-center
                         justify-center rounded-full bg-white/70 backdrop-blur
                         text-slate-700 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ============================================================= */
/* ----------------------   Rechtstexte   ----------------------- */
function Impressum() {
  const { t } = useTranslation();
  return (
    <article className="prose prose-slate max-w-none">
      <h2>{t('legal.imprint.dsgInfo')}</h2>
      <p>
        <strong>{t('legal.imprint.responsible')}</strong><br/>
        Lukas Kreibig<br/>
        Wipperstr. 6<br/>
        12055 Berlin
      </p>

      <p>
        <strong>{t('legal.imprint.contact')}</strong><br/>
        {t('legal.imprint.phone')}: +49 (176) 4446 9498<br/>
        {t('legal.imprint.email')}: lukas.kreibig@posteo.de
      </p>
{/* 
      <p>
        <strong>USt-ID</strong> gemäß § 27a UStG: DE 999 999 999
      </p> */}

      <h2>{t('legal.imprint.disputeResolution')}</h2>
      <p>
        {t('legal.imprint.euCommission')}&nbsp;
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>. {t('legal.imprint.disputeDisclaimer')}
      </p>
    </article>
  );
}

function Datenschutz() {
  const { t } = useTranslation();
  return (
    <article className="prose prose-slate max-w-none leading-relaxed">
      <p>
        {t('legal.privacy.intro')}
      </p>

      {/* ---------- 1. Verantwortlicher ---------- */}
      <h2 id="verantwortlicher">{t('legal.privacy.responsible.title')}</h2>
      <p>
        Lukas Kreibig – {t('legal.privacy.responsible.details')}&nbsp;
      </p>

      {/* ---------- 2. Datenarten + Zwecke ---------- */}
      <h2 id="daten">{t('legal.privacy.dataProcessing.title')}</h2>

      <table>
        <thead>
          <tr>
            <th>{t('legal.privacy.dataProcessing.category')}</th>
            <th>{t('legal.privacy.dataProcessing.purpose')}</th>
            <th>{t('legal.privacy.dataProcessing.legalBasis')}</th>
            <th>{t('legal.privacy.dataProcessing.duration')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t('legal.privacy.dataProcessing.serverLogs')}<br/>{t('legal.privacy.dataProcessing.serverLogsDetails')}</td>
            <td>{t('legal.privacy.dataProcessing.websiteOperation')}</td>
            <td>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f&nbsp;DSGVO<br/>{t('legal.privacy.dataProcessing.legitimateInterest')}</td>
            <td>{t('legal.privacy.dataProcessing.days')}</td>
          </tr>
          <tr>
            <td>{t('legal.privacy.dataProcessing.cookies')}</td>
            <td>{t('legal.privacy.dataProcessing.sessionControl')}</td>
            <td>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f&nbsp;DSGVO</td>
            <td>{t('legal.privacy.dataProcessing.browserEnd')}</td>
          </tr>
          <tr>
            <td>{t('legal.privacy.dataProcessing.emailContent')}</td>
            <td>{t('legal.privacy.dataProcessing.requestProcessing')}</td>
            <td>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b&nbsp;DSGVO</td>
            <td>{t('legal.privacy.dataProcessing.contractCompletion')}</td>
          </tr>
        </tbody>
      </table>

      {/* ---------- 3. Externe Dienste ---------- */}
      <h2 id="dienste">{t('legal.privacy.thirdParty.title')}</h2>
      <p>
        {t('legal.privacy.thirdParty.mapbox')}<br/>
        {t('legal.privacy.thirdParty.moreInfo')} 
        <a
          href="https://www.mapbox.com/legal/privacy"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Mapbox Privacy Policy
        </a>.
      </p>

      {/* ---------- 4. Ihre Rechte ---------- */}
      <h2 id="rechte">{t('legal.privacy.rights.title')}</h2>
      <ul className="space-y-1">
        <li>{t('legal.privacy.rights.access')}</li>
        <li>{t('legal.privacy.rights.rectification')}</li>
        <li>{t('legal.privacy.rights.erasure')}</li>
        <li>{t('legal.privacy.rights.restriction')}</li>
        <li>{t('legal.privacy.rights.portability')}</li>
        <li>{t('legal.privacy.rights.objection')}</li>
        <li>{t('legal.privacy.rights.complaint')}</li>
      </ul>

      {/* ---------- 5. Änderungen ---------- */}
      <h2 id="aenderungen">{t('legal.privacy.changes.title')}</h2>
      <p>
        {t('legal.privacy.changes.description')}
      </p>
    </article>
  );
}
