"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    color?: string
  }
}

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-zinc-500 [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-zinc-200 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-zinc-300 [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-zinc-200 [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color)
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig.map(([key, item]) => `  --color-${key}: ${item.color};`).join("\n")}
}
`,
      }}
    />
  )
}

function ChartTooltip({
  active,
  payload,
  className,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string; value?: string | number }>
  className?: string
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div className={cn("rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-sm", className)}>
      {payload.map((item) => {
        const key = item.dataKey as string
        const label = config[key]?.label ?? key
        return (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">{label}</span>
            <span className="font-medium text-zinc-900">{item.value as string | number}</span>
          </div>
        )
      })}
    </div>
  )
}

export { ChartContainer, ChartTooltip }
