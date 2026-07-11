import { Cut, LotCalculation, LotStatus, CutCalculation } from "./types";

export function calculateLot(
  inputWeightKg: number,
  totalCost: number,
  desiredMarginPercent: number,
  cuts: Cut[]
): LotCalculation {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const safeInput = Math.max(0, inputWeightKg);
  const safeCost = Math.max(0, totalCost);
  const safeCuts = cuts.map((c) => ({
    ...c,
    weightKg: Math.max(0, c.weightKg),
    salePricePerKg: Math.max(0, c.salePricePerKg),
  }));

  const totalCutsWeightKg = safeCuts.reduce((sum, c) => sum + c.weightKg, 0);
  const sellableWeightKg = safeCuts
    .filter((c) => c.salePricePerKg > 0)
    .reduce((sum, c) => sum + c.weightKg, 0);
  const lossWeightKg = Math.max(0, safeInput - sellableWeightKg);

  if (totalCutsWeightKg > safeInput * 1.01 && safeInput > 0) {
    warnings.push(
      `O peso total dos cortes (${fmtW(totalCutsWeightKg)}) é maior que o peso de entrada (${fmtW(safeInput)}). Verifique os dados.`
    );
  }

  if (totalCutsWeightKg < safeInput * 0.8 && totalCutsWeightKg > 0) {
    warnings.push(
      "O peso total dos cortes é bem menor que o peso de entrada. Verifique se você registrou todos os cortes, incluindo perdas."
    );
  }

  if (sellableWeightKg === 0 && safeCuts.length > 0) {
    warnings.push("Nenhum corte com preço de venda foi informado.");
  }

  const yieldPercent = safeInput > 0 ? (sellableWeightKg / safeInput) * 100 : 0;
  const lossPercent = safeInput > 0 ? (lossWeightKg / safeInput) * 100 : 0;
  const originalCostPerKg = safeInput > 0 ? safeCost / safeInput : 0;
  const realCostPerSellableKg = sellableWeightKg > 0 ? safeCost / sellableWeightKg : 0;

  const expectedRevenue = safeCuts.reduce((sum, c) => sum + c.weightKg * c.salePricePerKg, 0);
  const grossProfit = expectedRevenue - safeCost;
  const grossMarginPercent = expectedRevenue > 0 ? (grossProfit / expectedRevenue) * 100 : 0;

  const desiredMarginDecimal = Math.min(Math.max(0, desiredMarginPercent), 99) / 100;
  const suggestedMinimumPricePerKg =
    desiredMarginDecimal < 1 && realCostPerSellableKg > 0
      ? realCostPerSellableKg / (1 - desiredMarginDecimal)
      : 0;

  if (desiredMarginPercent >= 100) {
    warnings.push("A margem desejada não pode ser 100% ou mais. Usando 99% como limite.");
  }

  const cutCalculations: CutCalculation[] = safeCuts.map((cut) => {
    const revenue = cut.weightKg * cut.salePricePerKg;
    const proportionalCost = cut.salePricePerKg > 0
      ? cut.weightKg * realCostPerSellableKg
      : 0;
    const profit = revenue - proportionalCost;
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    if (
      cut.salePricePerKg === 0 &&
      !["perda", "osso", "sebo", "retalho"].includes(cut.category)
    ) {
      warnings.push(`O corte "${cut.name}" está sem preço de venda, mas não é perda/osso/sebo.`);
    }

    if (cut.salePricePerKg > 0 && marginPercent < 0) {
      warnings.push(`O corte "${cut.name}" está com margem negativa.`);
    }

    return {
      cutId: cut.id,
      name: cut.name,
      category: cut.category,
      weightKg: cut.weightKg,
      salePricePerKg: cut.salePricePerKg,
      revenue,
      proportionalCost,
      profit,
      marginPercent,
    };
  });

  const status = getStatus(grossMarginPercent, grossProfit);

  if (realCostPerSellableKg > originalCostPerKg && originalCostPerKg > 0) {
    recommendations.push(
      "Seu custo real por kg vendável ficou acima do custo de compra. Isso é normal após a desossa, mas exige atenção na precificação."
    );
  }

  if (lossPercent > 25) {
    recommendations.push(
      "A quebra passou de 25%. Verifique se o fornecedor, o tipo de peça ou o padrão de limpeza estão prejudicando sua margem."
    );
  }

  if (grossMarginPercent >= 20) {
    recommendations.push(
      "Este lote apresentou boa margem bruta. Salve o fornecedor para comparar com os próximos lotes."
    );
  }

  if (expectedRevenue < safeCost && safeCost > 0) {
    recommendations.push(
      "A receita prevista é menor que o custo. Revise os preços de venda dos seus cortes."
    );
  }

  const cutsWithNegativeMargin = cutCalculations.filter(
    (c) => c.salePricePerKg > 0 && c.marginPercent < 0
  );
  if (cutsWithNegativeMargin.length > 0) {
    recommendations.push(
      "O preço de venda de alguns cortes pode estar abaixo do custo real. Revise os cortes com margem negativa."
    );
  }

  return {
    totalCost: safeCost,
    inputWeightKg: safeInput,
    totalCutsWeightKg,
    sellableWeightKg,
    lossWeightKg,
    yieldPercent,
    lossPercent,
    originalCostPerKg,
    realCostPerSellableKg,
    expectedRevenue,
    grossProfit,
    grossMarginPercent,
    suggestedMinimumPricePerKg,
    status,
    cuts: cutCalculations,
    warnings,
    recommendations,
  };
}

function getStatus(margin: number, profit: number): LotStatus {
  if (profit < 0) return "prejuizo";
  if (margin >= 30) return "excelente";
  if (margin >= 20) return "saudavel";
  if (margin >= 10) return "atencao";
  return "risco";
}

function fmtW(kg: number): string {
  return kg.toFixed(2).replace(".", ",") + " kg";
}
