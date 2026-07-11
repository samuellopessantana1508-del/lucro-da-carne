import { Lot, LotCalculation } from "./types";
import { formatCurrency, formatWeight, formatPercent, formatDateBR } from "./format";
import { LOT_TYPE_LABELS, STATUS_CONFIG } from "./constants";

export function generateReport(lot: Lot, calc: LotCalculation): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════");
  lines.push("  RELATÓRIO DO LOTE | LUCRO DA CARNE");
  lines.push("═══════════════════════════════════════");
  lines.push("");
  lines.push(`Lote: ${lot.name}`);
  lines.push(`Data: ${formatDateBR(lot.date)}`);
  lines.push(`Tipo de compra: ${LOT_TYPE_LABELS[lot.type]}`);
  lines.push(`Fornecedor: ${lot.supplier || "Não informado"}`);
  lines.push("");
  lines.push("───────────────────────────────────────");
  lines.push("  DADOS DE ENTRADA");
  lines.push("───────────────────────────────────────");
  lines.push(`Peso de entrada: ${formatWeight(calc.inputWeightKg)}`);
  lines.push(`Custo por kg: ${formatCurrency(calc.originalCostPerKg)}`);
  lines.push(`Custo total: ${formatCurrency(calc.totalCost)}`);
  lines.push("");
  lines.push("───────────────────────────────────────");
  lines.push("  RENDIMENTO");
  lines.push("───────────────────────────────────────");
  lines.push(`Peso vendável: ${formatWeight(calc.sellableWeightKg)}`);
  lines.push(`Quebra/perda: ${formatWeight(calc.lossWeightKg)}`);
  lines.push(`Rendimento: ${formatPercent(calc.yieldPercent)}`);
  lines.push(`Quebra: ${formatPercent(calc.lossPercent)}`);
  lines.push("");
  lines.push("───────────────────────────────────────");
  lines.push("  RESULTADO FINANCEIRO");
  lines.push("───────────────────────────────────────");
  lines.push(`Custo real por kg vendável: ${formatCurrency(calc.realCostPerSellableKg)}`);
  lines.push(`Receita prevista: ${formatCurrency(calc.expectedRevenue)}`);
  lines.push(`Lucro bruto previsto: ${formatCurrency(calc.grossProfit)}`);
  lines.push(`Margem bruta: ${formatPercent(calc.grossMarginPercent)}`);
  lines.push(`Status: ${STATUS_CONFIG[calc.status].label}`);
  lines.push("");
  lines.push("───────────────────────────────────────");
  lines.push("  CORTES");
  lines.push("───────────────────────────────────────");

  for (const cut of calc.cuts) {
    const line = `• ${cut.name}: ${formatWeight(cut.weightKg)} | ${formatCurrency(cut.salePricePerKg)}/kg | Receita: ${formatCurrency(cut.revenue)} | Margem: ${formatPercent(cut.marginPercent)}`;
    lines.push(line);
  }

  if (calc.recommendations.length > 0) {
    lines.push("");
    lines.push("───────────────────────────────────────");
    lines.push("  RECOMENDAÇÕES");
    lines.push("───────────────────────────────────────");
    for (const rec of calc.recommendations) {
      lines.push(`• ${rec}`);
    }
  }

  lines.push("");
  lines.push("═══════════════════════════════════════");
  lines.push("  Gerado por Lucro da Carne");
  lines.push("═══════════════════════════════════════");

  return lines.join("\n");
}
