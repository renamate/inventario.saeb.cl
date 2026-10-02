"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  ok: { label: "OK", color: "var(--chart-1)" },
  critico: { label: "Crítico", color: "var(--chart-2)" },
  negativo: { label: "Negativo", color: "var(--chart-3)" },
} satisfies ChartConfig;

type Fila = { almacen: string; ok: number; critico: number; negativo: number };

export function GraficoAlmacenes({ datos }: { datos: Fila[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="almacen" type="category" width={112} tickLine={false} axisLine={false} fontSize={12} />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="ok" stackId="a" fill="var(--color-ok)" radius={[4, 0, 0, 4]} />
        <Bar dataKey="critico" stackId="a" fill="var(--color-critico)" />
        <Bar dataKey="negativo" stackId="a" fill="var(--color-negativo)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
