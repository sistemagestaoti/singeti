"use client";

import { useState, useEffect } from "react";
import { CloudRain } from "lucide-react";
import { formatLongDateBR, formatTimeBR } from "@/lib/dateUtils";

export function DashboardClock({
  initialDate,
  initialTime,
}: {
  initialDate: string;
  initialTime: string;
}) {
  const [dateStr, setDateStr] = useState(initialDate);
  const [timeStr, setTimeStr] = useState(initialTime);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setDateStr(formatLongDateBR(now));
      setTimeStr(formatTimeBR(now));
    };

    updateClock();
    const timer = setInterval(updateClock, 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between sm:flex-col sm:items-end text-left sm:text-right gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
      <p className="text-xs sm:text-sm font-medium text-muted-foreground capitalize" suppressHydrationWarning>
        {dateStr}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums" suppressHydrationWarning>
          {timeStr}
        </span>
        <div className="flex items-center gap-1.5 text-info bg-info/10 px-2 py-0.5 rounded-full border border-info/20">
          <CloudRain className="w-4 h-4" />
          <span className="text-xs font-bold text-foreground">24ºC</span>
        </div>
      </div>
    </div>
  );
}
