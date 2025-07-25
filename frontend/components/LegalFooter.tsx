/* ------------------------------------------------------------------
   components/LegalFooter.tsx
------------------------------------------------------------------ */
"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog  from "@radix-ui/react-dialog";
import { Info, X }  from "lucide-react";
import clsx         from "clsx";

/* ---------- Button + Popover ---------------------------------- */
export default function LegalFooter() {
  const [openDoc, setOpenDoc] = useState<"impressum" | "dse" | null>(null);

  return (
    <>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            aria-label="Rechtliche Informationen"
            className="fixed bottom-6 right-6 z-[999] rounded-full bg-white/80
                       p-3 shadow-lg ring-1 ring-slate-900/10 backdrop-blur
                       transition-colors hover:bg-white"
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
            <p className="mb-2 font-semibold">Rechtliches</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <button
                  onClick={() => setOpenDoc("impressum")}
                  className="underline hover:text-sky-700"
                >
                  Impressum
                </button>
              </li>
              <li>
                <button
                  onClick={() => setOpenDoc("dse")}
                  className="underline hover:text-sky-700"
                >
                  Datenschutzerklärung
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
  const title =
    type === "impressum" ? "Impressum"
    : type === "dse"      ? "Datenschutzerklärung"
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
              aria-label="Schließen"
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
  return (
    <article className="prose prose-slate max-w-none">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <p>
        <strong>Verantwortlich</strong><br/>
        Lukas Kreibig<br/>
        Wipperstr. 6<br/>
        12055 Berlin
      </p>

      <p>
        <strong>Kontakt</strong><br/>
        Tel.: +49 (176) 4446 9498<br/>
        E-Mail: lukas.kreibig@posteo.de
      </p>
{/* 
      <p>
        <strong>USt-ID</strong> gemäß § 27a UStG: DE 999 999 999
      </p> */}

      <h2>Streitbeilegung</h2>
      <p>
        Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:&nbsp;
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>. Wir sind weder verpflichtet noch bereit, an einem
        Streitbeilegungs­verfahren vor einer Verbraucher­schlichtungsstelle teilzunehmen.
      </p>
    </article>
  );
}

function Datenschutz() {
  return (
    <article className="prose prose-slate max-w-none leading-relaxed">
      <p>
        Nachfolgend informieren wir Sie gemäß Art.&nbsp;13 ff. DSGVO über Art,
        Umfang und Zweck der Verarbeitung personenbezogener Daten auf dieser
        Website.
      </p>

      {/* ---------- 1. Verantwortlicher ---------- */}
      <h2 id="verantwortlicher">1. Verantwortlicher</h2>
      <p>
        Lukas Kreibig – vollständige Kontaktdaten siehe&nbsp;
        <a href="#" onClick={(e)=>{e.preventDefault();}} className="underline">
          Impressum
        </a>
      </p>

      {/* ---------- 2. Datenarten + Zwecke ---------- */}
      <h2 id="daten">2. Welche Daten verarbeiten wir & warum?</h2>

      <table>
        <thead>
          <tr>
            <th>Datenkategorie</th>
            <th>Zweck</th>
            <th>Rechts&shy;grundlage</th>
            <th>Speicher­dauer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Server-Logfiles<br/>(IP-Adresse, Zeitstempel, URL, Referrer, User-Agent)</td>
            <td>Betrieb &amp; Sicher­heit der Website</td>
            <td>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f&nbsp;DSGVO<br/>(berechtigtes Interesse)</td>
            <td>7 Tage</td>
          </tr>
          <tr>
            <td>Technisch not­wen­dige Cookies</td>
            <td>Sitzungs­steuerung (z.&nbsp;B. bevorzugte Sprache)</td>
            <td>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f&nbsp;DSGVO</td>
            <td>Bis Browser-Ende bzw. max. 1 Jahr</td>
          </tr>
          <tr>
            <td>E-Mail-Inhalte / Kontakt­daten</td>
            <td>Bearbeitung Ihrer Anfrage</td>
            <td>Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b&nbsp;DSGVO</td>
            <td>Bis Abschluss des Vorgangs + gesetzl. Aufbewahrung</td>
          </tr>
        </tbody>
      </table>

      {/* ---------- 3. Externe Dienste ---------- */}
      <h2 id="dienste">3. Eingesetzte Dritt­dienste</h2>
      <p>
        Für Karten-Darstellungen wird Mapbox&nbsp;Inc. (USA) eingesetzt. Dabei wird
        die IP-Adresse nur in gekürzter Form übertragen. Rechts­grundlage ist
        unser berechtigtes Interesse an einer ansprechenden Darstellung
        (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO).<br/>
        Weitere Informationen: 
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
      <h2 id="rechte">4. Ihre Rechte</h2>
      <ul className="space-y-1">
        <li>Auskunft – Art.&nbsp;15&nbsp;DSGVO</li>
        <li>Berichtigung – Art.&nbsp;16&nbsp;DSGVO</li>
        <li>Löschung – Art.&nbsp;17&nbsp;DSGVO</li>
        <li>Einschränkung der Verarbeitung – Art.&nbsp;18&nbsp;DSGVO</li>
        <li>Daten­übertrag­barkeit – Art.&nbsp;20&nbsp;DSGVO</li>
        <li>Widerspruch – Art.&nbsp;21&nbsp;DSGVO</li>
        <li>
          Beschwerde bei einer Aufsichtsbehörde – Art.&nbsp;77&nbsp;DSGVO
        </li>
      </ul>

      {/* ---------- 5. Änderungen ---------- */}
      <h2 id="aenderungen">5. Änderungen dieser Erklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an
        geänderte Rechts­lagen oder neue Dienste anzupassen. Bitte prüfen Sie
        daher regelmäßig den aktuellen Stand.
      </p>
    </article>
  );
}
