"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-grid_line]:stroke-border/60 [&_.recharts-tooltip-cursor]:stroke-border [&_.recharts-wrapper]:outline-none",
          className,
        )}
        style={{
          ...Object.fromEntries(
            Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]),
          ),
          ...props.style,
        } as React.CSSProperties}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    color?: string;
    name?: string;
  }>;
  label?: string;
  className?: string;
  valueFormatter?: (value: number | string) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={cn("grid min-w-32 gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg", className)}>
      {label ? <div className="font-medium text-foreground">{label}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "");
          const itemConfig = config[key];

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: item.color || itemConfig?.color }}
                />
                <span>{itemConfig?.label || item.name || key}</span>
              </div>
              <span className="font-mono font-medium text-foreground">
                {valueFormatter ? valueFormatter(item.value ?? "") : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltipContent };
