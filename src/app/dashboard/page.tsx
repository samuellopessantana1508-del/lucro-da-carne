"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import EmptyState from "@/components/EmptyState";
import { useLotsStore } from "@/hooks/useLots";
import { useAuth } from "@/hooks/useAuth";
import { calculateLot } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Percent,
  Scale,
  TrendingDown,
  Truck,
  Hash,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lots, loaded, loadedFor, error, loadLots } = useLotsStore();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!loaded || loadedFor !== userId) void loadLots(userId);
  }, [loaded, loadedFor, loadLots, userId]);

  const data = useMemo(() => {
    if (lots.length === 0) return null;

    const calcs = lots.map((lot) => ({
      lot,
      calc: calculateLot(lot.inputWeightKg, lot.totalCost, lot.desiredMarginPercent, lot.cuts),
    }));

    const totalRevenue = calcs.reduce((s, { calc }) => s + calc.expectedRevenue, 0);
    const totalProfit = calcs.reduce((s, { calc }) => s + calc.grossProfit, 0);
    const avgMargin =
      calcs.reduce((s, { calc }) => s + calc.grossMarginPercent, 0) / calcs.length;
    const avgYield = calcs.reduce((s, { calc }) => s + calc.yieldPercent, 0) / calcs.length;
    const avgLoss = calcs.reduce((s, { calc }) => s + calc.lossPercent, 0) / calcs.length;

    const supplierMap = new Map<string, { count: number; totalMargin: number; totalYield: number }>();
    for (const { lot, calc } of calcs) {
      const s = lot.supplier || "Sem fornecedor";
      const cur = supplierMap.get(s) || { count: 0, totalMargin: 0, totalYield: 0 };
      cur.count++;
      cur.totalMargin += calc.grossMarginPercent;
      cur.totalYield += calc.yieldPercent;
      supplierMap.set(s, cur);
    }

    let bestSupplier = { name: "-", avgMargin: 0 };
    let worstSupplier = { name: "-", avgMargin: 100 };
    for (const [name, data] of supplierMap) {
      const avg = data.totalMargin / data.count;
      if (avg > bestSupplier.avgMargin) bestSupplier = { name, avgMargin: avg };
      if (avg < worstSupplier.avgMargin) worstSupplier = { name, avgMargin: avg };
    }

    const chartProfit = calcs
      .slice()
      .reverse()
      .map(({ lot, calc }) => ({
        name: lot.name.length > 15 ? lot.name.slice(0, 15) + "…" : lot.name,
        lucro: Math.round(calc.grossProfit * 100) / 100,
      }));

    const chartYield = calcs
      .slice()
      .reverse()
      .map(({ lot, calc }) => ({
        name: lot.name.length > 15 ? lot.name.slice(0, 15) + "…" : lot.name,
        rendimento: Math.round(calc.yieldPercent * 10) / 10,
      }));

    const chartLoss = calcs
      .slice()
      .reverse()
      .map(({ lot, calc }) => ({
        name: lot.name.length > 15 ? lot.name.slice(0, 15) + "…" : lot.name,
        quebra: Math.round(calc.lossPercent * 10) / 10,
      }));

    const chartSuppliers = Array.from(supplierMap.entries()).map(([name, d]) => ({
      name: name.length > 15 ? name.slice(0, 15) + "…" : name,
      margem: Math.round((d.totalMargin / d.count) * 10) / 10,
      rendimento: Math.round((d.totalYield / d.count) * 10) / 10,
    }));

    return {
      totalRevenue,
      totalProfit,
      avgMargin,
      avgYield,
      avgLoss,
      bestSupplier,
      worstSupplier,
      count: lots.length,
      chartProfit,
      chartYield,
      chartLoss,
      chartSuppliers,
    };
  }, [lots]);

  const tooltipStyle = {
    contentStyle: {
      background: "#fff",
      border: "1px solid #E5DED3",
      borderRadius: 8,
      fontSize: 13,
    },
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl font-bold text-[#4A0F14] mb-6">Dashboard</h1>

        {error ? (
          <div className="rounded-lg border border-[#B23A3A]/30 bg-[#FFEBEE] p-4 text-sm text-[#B23A3A]">
            {error}
          </div>
        ) : !loaded ? (
          <div className="text-center py-20 text-[#8A8178]">Carregando...</div>
        ) : !data ? (
          <EmptyState
            icon={BarChart3}
            title="Sem dados ainda"
            description="Salve lotes na calculadora para ver seu dashboard com indicadores e gráficos."
            action={{
              label: "Calcular primeiro lote",
              onClick: () => router.push("/calculadora"),
            }}
          />
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Receita prevista total"
                value={formatCurrency(data.totalRevenue)}
                icon={DollarSign}
              />
              <MetricCard
                label="Lucro bruto total"
                value={formatCurrency(data.totalProfit)}
                icon={TrendingUp}
                variant={data.totalProfit >= 0 ? "success" : "danger"}
              />
              <MetricCard
                label="Margem média"
                value={formatPercent(data.avgMargin)}
                icon={Percent}
                variant={data.avgMargin >= 20 ? "success" : data.avgMargin >= 10 ? "warning" : "danger"}
              />
              <MetricCard
                label="Rendimento médio"
                value={formatPercent(data.avgYield)}
                icon={Scale}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Quebra média"
                value={formatPercent(data.avgLoss)}
                icon={TrendingDown}
                variant={data.avgLoss > 25 ? "danger" : "default"}
              />
              <MetricCard
                label="Melhor fornecedor"
                value={data.bestSupplier.name}
                icon={Truck}
                subtitle={`Margem média: ${formatPercent(data.bestSupplier.avgMargin)}`}
                variant="success"
              />
              <MetricCard
                label="Pior fornecedor"
                value={data.worstSupplier.name}
                icon={Truck}
                subtitle={`Margem média: ${formatPercent(data.worstSupplier.avgMargin)}`}
                variant="danger"
              />
              <MetricCard
                label="Lotes calculados"
                value={String(data.count)}
                icon={Hash}
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="text-sm font-bold text-[#4A0F14] mb-4">Lucro por lote</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartProfit}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DED3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="lucro" fill="#2F7D46" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-bold text-[#4A0F14] mb-4">Rendimento por lote (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartYield}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DED3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="rendimento" fill="#7A1E24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-bold text-[#4A0F14] mb-4">Quebra por lote (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartLoss}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DED3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="quebra" fill="#B23A3A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-bold text-[#4A0F14] mb-4">Comparativo de fornecedores</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartSuppliers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DED3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="margem" fill="#C89B3C" name="Margem %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rendimento" fill="#7A1E24" name="Rendimento %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
