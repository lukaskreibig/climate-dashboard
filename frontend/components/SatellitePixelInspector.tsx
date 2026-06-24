"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  ChartCallout,
  ChartSourceBadge,
} from "@/components/ChartExplainers";

interface Props {
  rawImg: string;
  maskImg: string;
}

export interface SatellitePixelInspectorApi {
  showStage: (stage: number) => void;
}

const samples = [
  { key: "ice", sourceX: 320, sourceY: 740, color: "#f7d64a" },
  { key: "thinIce", sourceX: 800, sourceY: 760, color: "#3dd6e7" },
  { key: "water", sourceX: 860, sourceY: 950, color: "#1d4ed8" },
] as const;

const IMAGE_W = 1251;
const IMAGE_H = 1500;

const SatellitePixelInspector = forwardRef<SatellitePixelInspectorApi, Props>(
  function SatellitePixelInspector({ rawImg, maskImg }, ref) {
    const { t } = useTranslation();
    const [stage, setStage] = useState(0);
    const imageRef = useRef<HTMLDivElement>(null);
    const [imageBox, setImageBox] = useState({ width: 0, height: 0 });
    const activeSample = samples[Math.min(Math.max(stage - 1, 0), samples.length - 1)];

    useImperativeHandle(ref, () => ({
      showStage: (nextStage: number) =>
        setStage(Math.max(0, Math.min(3, nextStage))),
    }));

    const labels = useMemo(
      () =>
        samples.reduce<Record<string, { title: string; body: string }>>(
          (acc, sample) => {
            acc[sample.key] = {
              title: t(`charts.pixelInspector.samples.${sample.key}.title`),
              body: t(`charts.pixelInspector.samples.${sample.key}.body`),
            };
            return acc;
          },
          {}
        ),
        [t]
    );

    useEffect(() => {
      const node = imageRef.current;
      if (!node) return;

      const update = () => {
        const rect = node.getBoundingClientRect();
        setImageBox({ width: rect.width, height: rect.height });
      };

      update();
      const observer = new ResizeObserver(update);
      observer.observe(node);
      return () => observer.disconnect();
    }, []);

    const markerPos = useMemo(() => {
      if (!imageBox.width || !imageBox.height) return { left: "50%", top: "50%" };

      const scale = Math.max(imageBox.width / IMAGE_W, imageBox.height / IMAGE_H);
      const renderedWidth = IMAGE_W * scale;
      const renderedHeight = IMAGE_H * scale;
      const offsetX = (imageBox.width - renderedWidth) / 2;
      const offsetY = (imageBox.height - renderedHeight) / 2;

      return {
        left: `${offsetX + activeSample.sourceX * scale}px`,
        top: `${offsetY + activeSample.sourceY * scale}px`,
      };
    }, [activeSample.sourceX, activeSample.sourceY, imageBox.height, imageBox.width]);

    return (
      <div
        className="relative grid h-screen content-center gap-4 px-4 text-white sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] lg:gap-6 lg:pl-[clamp(1.5rem,4vw,4rem)] lg:pr-[calc(var(--progress-gutter,64px)+2.25rem)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]"
        data-testid="satellite-pixel-inspector"
      >
        <div className="absolute left-7 top-[calc(50%-min(38vh,360px)-1.2rem)] z-20 hidden lg:block">
          <ChartSourceBadge
            href="https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2"
            className="border-white/15 bg-slate-900/80 text-slate-200 hover:border-white/40 hover:text-white"
          >
            {t("charts.pixelInspector.source")}
          </ChartSourceBadge>
        </div>

        <div
          ref={imageRef}
          className="relative mx-auto aspect-[1.35/1] w-full max-h-[76vh] max-w-[min(100%,920px)] overflow-hidden rounded-sm bg-slate-900 ring-1 ring-white/10"
        >
          <Image
            src={rawImg}
            alt={t("charts.pixelInspector.rawAlt")}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
            priority={false}
          />
          <Image
            src={maskImg}
            alt={t("charts.pixelInspector.maskAlt")}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover transition-opacity duration-500"
            style={{ opacity: stage >= 1 ? 0.7 : 0 }}
            priority={false}
          />

          {stage >= 1 && (
            <div
              className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950/10 shadow-[0_0_0_1px_rgba(15,23,42,0.6),0_0_18px_rgba(255,255,255,0.6)] transition-all duration-500"
              style={markerPos}
            >
              <div
                className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm ring-2 ring-white"
                style={{ backgroundColor: activeSample.color }}
              />
            </div>
          )}
        </div>

        <div className="flex max-w-[420px] flex-col justify-center gap-3 justify-self-start lg:max-w-[390px] xl:max-w-[420px]">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-sky-200/80">
              {t("charts.pixelInspector.kicker")}
            </div>
            <h3 className="mt-2 text-2xl font-semibold leading-tight md:text-[1.65rem]">
              {t("charts.pixelInspector.title")}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300 lg:text-[13px] xl:text-sm">
              {t("charts.pixelInspector.body")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ChartSourceBadge
              href="https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2"
              className="border-white/15 bg-slate-900/80 text-slate-200 hover:border-white/40 hover:text-white"
            >
              {t("charts.pixelInspector.originalSource")}
            </ChartSourceBadge>
            <ChartSourceBadge
              href="https://www.github.com/lukaskreibig/"
              className="border-white/15 bg-slate-900/80 text-slate-200 hover:border-white/40 hover:text-white"
            >
              {t("charts.pixelInspector.methodSource")}
            </ChartSourceBadge>
          </div>

          <div className="grid gap-2">
            {samples.map((sample, index) => {
              const active = stage >= 1 && sample.key === activeSample.key;
              return (
                <div
                  key={sample.key}
                  className={`rounded-md border p-2.5 transition-colors ${
                    active
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className="h-3 w-3 rounded-sm ring-1 ring-white/60"
                      style={{ backgroundColor: sample.color }}
                    />
                    {labels[sample.key]?.title}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-300 xl:text-xs">
                    {labels[sample.key]?.body}
                  </div>
                  {stage === 0 && index === 0 ? (
                    <span className="sr-only">{t("charts.pixelInspector.rawOnly")}</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <ChartCallout tone="dark">
            {stage === 0
              ? t("charts.pixelInspector.calloutRaw")
              : stage >= 3
              ? t("charts.pixelInspector.calloutOutput")
              : t("charts.pixelInspector.calloutMask")}
          </ChartCallout>
        </div>
      </div>
    );
  }
);

SatellitePixelInspector.displayName = "SatellitePixelInspector";
export default SatellitePixelInspector;
