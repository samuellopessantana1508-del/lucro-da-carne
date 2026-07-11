"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import AlertBox from "@/components/AlertBox";
import RecommendationBox from "@/components/RecommendationBox";
import EmptyState from "@/components/EmptyState";
import { useLotsStore } from "@/hooks/useLots";
import { useAuth } from "@/hooks/useAuth";
import { calculateLot } from "@/lib/calculations";
import { generateReport } from "@/lib/report";
import { generatePDF } from "@/lib/report-pdf";
import { formatCurrency, formatWeight, formatPercent, formatDateBR } from "@/lib/format";
import { LOT_TYPE_LABELS, CUT_CATEGORY_LABELS, STATUS_CONFIG } from "@/lib/constants";
import {
  ArrowLeft,
  FileText,
  Download,
  Copy,
  Printer,
  Trash2,
  DollarSign,
  Weight,
  Scale,
  TrendingDown,
  TrendingUp,
  Target,
  Percent,
  Package,
} from "lucide-react";

export default function LoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { lots, loaded, loadedFor, error, loadLots, removeLot, copyLot } = useLotsStore();
  const userId = user?.id ?? null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loaded || loadedFor !== userId) void loadLots(userId);
  }, [loaded, loadedFor, loadLots, userId]);

  const lot = lots.find((l) => l.id === params.id);

  if (!loaded) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-[#8A8178]">Carregando...</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
          <div className="rounded-lg border border-[#B23A3A]/30 bg-[#FFEBEE] p-4 text-sm text-[#B23A3A]">
            {error}
          </div>
        </main>
      </>
    );
  }

  if (!lot) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
          <EmptyState
            icon={Package}
            title="Lote não encontrado"
            description="Este lote pode ter sido excluído ou o link está incorreto."
            action={{
              label: "Ver histórico",
              onClick: () => router.push("/historico"),
            }}
          />
        </main>
      </>
    );
  }

  const currentLot = lot;
  const calc = calculateLot(
    currentLot.inputWeightKg,
    currentLot.totalCost,
    currentLot.desiredMarginPercent,
    currentLot.cuts
  );

  function handleCopy() {
    const report = generateReport(currentLot, calc);
    try {
      navigator.clipboard.writeText(report);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handleDownloadPDF() {
    generatePDF(currentLot, calc);
  }

  function handlePrint() {
    window.print();
  }

  async function handleDelete() {
    if (confirm("Tem certeza que deseja excluir este lote?")) {
      await removeLot(currentLot.id);
      router.push("/historico");
    }
  }

  async function handleDuplicate() {
    const dup = await copyLot(currentLot.id);
    if (dup) router.push(`/lote/${dup.id}`);
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Back + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button onClick={() => router.push("/historico")} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao histórico
          </button>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleDownloadPDF} className="btn-secondary text-sm">
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>
            <button onClick={handleCopy} className="btn-ghost text-sm">
              <FileText className="w-4 h-4" />
              {copied ? "Copiado!" : "Copiar texto"}
            </button>
            <button onClick={handlePrint} className="btn-ghost text-sm">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button onClick={handleDuplicate} className="btn-ghost text-sm">
              <Copy className="w-4 h-4" />
              Duplicar
            </button>
            <button onClick={handleDelete} className="btn-ghost text-sm text-[#B23A3A]">
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        {/* Header info */}
        <div className="card p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#4A0F14]">{lot.name}</h1>
              <p className="text-sm text-[#8A8178] mt-1">
                {formatDateBR(lot.date)} • {LOT_TYPE_LABELS[lot.type]}
                {lot.supplier && ` • ${lot.supplier}`}
              </p>
              {lot.notes && <p className="text-sm text-[#8A8178] mt-2 italic">{lot.notes}</p>}
            </div>
            <div
              className="px-4 py-2 rounded-full font-bold text-sm flex-shrink-0"
              style={{
                backgroundColor: STATUS_CONFIG[calc.status].bg,
                color: STATUS_CONFIG[calc.status].color,
              }}
            >
              {STATUS_CONFIG[calc.status].label} · {formatPercent(calc.grossMarginPercent)}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {calc.warnings.length > 0 && (
          <div className="space-y-2 mb-6">
            {calc.warnings.map((w, i) => (
              <AlertBox key={i} type="warning" message={w} />
            ))}
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Custo total" value={formatCurrency(calc.totalCost)} icon={DollarSign} />
          <MetricCard label="Peso de entrada" value={formatWeight(calc.inputWeightKg)} icon={Weight} />
          <MetricCard
            label="Peso vendável"
            value={formatWeight(calc.sellableWeightKg)}
            icon={Scale}
            subtitle={`Rendimento: ${formatPercent(calc.yieldPercent)}`}
          />
          <MetricCard
            label="Quebra / Perda"
            value={formatWeight(calc.lossWeightKg)}
            icon={TrendingDown}
            variant={calc.lossPercent > 25 ? "danger" : "default"}
            subtitle={`Quebra: ${formatPercent(calc.lossPercent)}`}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Custo / kg original" value={formatCurrency(calc.originalCostPerKg)} icon={DollarSign} />
          <MetricCard
            label="Custo real / kg vendável"
            value={formatCurrency(calc.realCostPerSellableKg)}
            icon={Target}
            variant="gold"
          />
          <MetricCard label="Receita prevista" value={formatCurrency(calc.expectedRevenue)} icon={TrendingUp} />
          <MetricCard
            label="Lucro bruto"
            value={formatCurrency(calc.grossProfit)}
            icon={DollarSign}
            variant={calc.grossProfit >= 0 ? "success" : "danger"}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <MetricCard
            label="Margem bruta"
            value={formatPercent(calc.grossMarginPercent)}
            icon={Percent}
            variant={calc.grossMarginPercent >= 20 ? "success" : calc.grossMarginPercent >= 10 ? "warning" : "danger"}
          />
          <MetricCard
            label="Preço mínimo sugerido / kg"
            value={formatCurrency(calc.suggestedMinimumPricePerKg)}
            icon={Target}
            subtitle={`Margem de ${formatPercent(lot.desiredMarginPercent)}`}
            variant="gold"
          />
          <MetricCard
            label="Rendimento"
            value={formatPercent(calc.yieldPercent)}
            icon={Scale}
            variant={calc.yieldPercent >= 75 ? "success" : calc.yieldPercent >= 60 ? "warning" : "danger"}
          />
        </div>

        {/* Cuts table */}
        <div className="card p-5 sm:p-6 mb-6">
          <h3 className="text-lg font-bold text-[#4A0F14] mb-4">Cortes do lote</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5DED3]">
                  <th className="text-left py-3 px-2 text-[#8A8178] font-semibold">Corte</th>
                  <th className="text-left py-3 px-2 text-[#8A8178] font-semibold">Categoria</th>
                  <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Peso</th>
                  <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">R$/kg</th>
                  <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Receita</th>
                  <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Custo prop.</th>
                  <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Lucro</th>
                  <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Margem</th>
                </tr>
              </thead>
              <tbody>
                {calc.cuts.map((cut) => (
                  <tr key={cut.cutId} className="border-b border-[#E5DED3]/50 hover:bg-[#F7F1E8]">
                    <td className="py-3 px-2 font-medium">{cut.name || "-"}</td>
                    <td className="py-3 px-2 text-[#8A8178] text-xs">{CUT_CATEGORY_LABELS[cut.category]}</td>
                    <td className="py-3 px-2 text-right">{formatWeight(cut.weightKg)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(cut.salePricePerKg)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(cut.revenue)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(cut.proportionalCost)}</td>
                    <td className={`py-3 px-2 text-right font-semibold ${cut.profit >= 0 ? "text-[#2F7D46]" : "text-[#B23A3A]"}`}>
                      {formatCurrency(cut.profit)}
                    </td>
                    <td className={`py-3 px-2 text-right font-semibold ${cut.marginPercent >= 0 ? "text-[#2F7D46]" : "text-[#B23A3A]"}`}>
                      {formatPercent(cut.marginPercent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <RecommendationBox recommendations={calc.recommendations} />
      </main>
    </>
  );
}
