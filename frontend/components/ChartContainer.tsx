"use client";

import { Card } from "@/components/ui/card";

interface Props {
  title: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartContainer({ title, headerExtra, children }: Props) {
  return (
    <Card className="mx-auto mb-24 w-[95vw] px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        {headerExtra}
      </div>
      {children}
    </Card>
  );
}
