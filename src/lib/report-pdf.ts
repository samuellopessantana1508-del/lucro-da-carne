"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Lot, LotCalculation } from "./types";
import { formatCurrency, formatWeight, formatPercent, formatDateBR } from "./format";
import { LOT_TYPE_LABELS, CUT_CATEGORY_LABELS, STATUS_CONFIG } from "./constants";

const COLORS = {
  wine: [122, 30, 36] as [number, number, number],
  wineDark: [74, 15, 20] as [number, number, number],
  charcoal: [31, 31, 31] as [number, number, number],
  cream: [247, 241, 232] as [number, number, number],
  gold: [200, 155, 60] as [number, number, number],
  warmGray: [138, 129, 120] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [229, 222, 211] as [number, number, number],
  success: [47, 125, 70] as [number, number, number],
  danger: [178, 58, 58] as [number, number, number],
};

function drawLogo(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  doc.setFillColor(...COLORS.gold);
  doc.circle(cx, cy, r, "F");

  doc.setFillColor(...COLORS.wineDark);
  doc.circle(cx, cy, r - 1.5, "F");

  doc.setFillColor(...COLORS.gold);
  doc.ellipse(cx + 1, cy, r * 0.55, r * 0.5, "F");

  doc.setDrawColor(...COLORS.wineDark);
  doc.setLineWidth(0.5);
  const s = r * 0.3;
  doc.line(cx - s * 0.6, cy - s * 0.5, cx + s * 0.8, cy - s * 0.2);
  doc.line(cx - s * 0.8, cy + s * 0.1, cx + s * 0.6, cy + s * 0.3);
  doc.line(cx - s * 0.4, cy + s * 0.5, cx + s * 0.5, cy + s * 0.6);

  doc.setFillColor(247, 241, 232);
  doc.circle(cx - r * 0.22, cy - r * 0.22, r * 0.17, "F");
  doc.setFillColor(...COLORS.wineDark);
  doc.circle(cx - r * 0.22, cy - r * 0.22, r * 0.09, "F");
}

export function generatePDF(lot: Lot, calc: LotCalculation): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // --- HEADER ---
  doc.setFillColor(...COLORS.wineDark);
  doc.rect(0, 0, pageW, 38, "F");

  drawLogo(doc, margin, 8, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text("Lucro da Carne", margin + 28, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gold);
  doc.text("Calculadora de rendimento, quebra e lucro para açougues", margin + 28, 25);

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  const dateStr = `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  doc.text(dateStr, pageW - margin, 18, { align: "right" });

  y = 46;

  // --- LOT TITLE ---
  doc.setFillColor(...COLORS.cream);
  doc.roundedRect(margin, y, contentW, 24, 3, 3, "F");
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 24, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.wineDark);
  doc.text(lot.name, margin + 6, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.warmGray);
  const subtitle = [
    formatDateBR(lot.date),
    LOT_TYPE_LABELS[lot.type],
    lot.supplier || undefined,
  ]
    .filter(Boolean)
    .join(" • ");
  doc.text(subtitle, margin + 6, y + 18);

  // Status badge
  const statusCfg = STATUS_CONFIG[calc.status];
  const statusText = `${statusCfg.label} · ${formatPercent(calc.grossMarginPercent)}`;
  const statusW = doc.getTextWidth(statusText) + 12;
  const statusX = pageW - margin - statusW - 4;

  const statusColor = hexToRgb(statusCfg.color);
  const statusBg = hexToRgb(statusCfg.bg);
  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(statusX, y + 4, statusW, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(statusText, statusX + 6, y + 9.5);

  y += 32;

  // --- SECTION: Dados de Entrada ---
  y = drawSectionTitle(doc, "DADOS DE ENTRADA", margin, y, contentW);

  const entryData: [string, string][] = [
    ["Peso de entrada", formatWeight(calc.inputWeightKg)],
    ["Custo por kg", formatCurrency(calc.originalCostPerKg)],
    ["Custo total", formatCurrency(calc.totalCost)],
    ["Margem desejada", formatPercent(lot.desiredMarginPercent)],
  ];

  y = drawKeyValueGrid(doc, entryData, margin, y, contentW);
  y += 6;

  // --- SECTION: Rendimento ---
  y = drawSectionTitle(doc, "RENDIMENTO E QUEBRA", margin, y, contentW);

  const yieldData: [string, string][] = [
    ["Peso vendável", formatWeight(calc.sellableWeightKg)],
    ["Quebra / Perda", formatWeight(calc.lossWeightKg)],
    ["Rendimento", formatPercent(calc.yieldPercent)],
    ["Quebra", formatPercent(calc.lossPercent)],
  ];

  y = drawKeyValueGrid(doc, yieldData, margin, y, contentW);
  y += 6;

  // --- SECTION: Resultado Financeiro ---
  y = drawSectionTitle(doc, "RESULTADO FINANCEIRO", margin, y, contentW);

  y = drawHighlightBox(doc, margin, y, contentW, calc);
  y += 6;

  // --- SECTION: Cortes ---
  y = drawSectionTitle(doc, "DETALHAMENTO DOS CORTES", margin, y, contentW);

  const tableHead = [["Corte", "Categoria", "Peso", "R$/kg", "Receita", "Custo", "Lucro", "Margem"]];
  const tableBody = calc.cuts.map((cut) => [
    cut.name || "-",
    CUT_CATEGORY_LABELS[cut.category],
    formatWeight(cut.weightKg),
    formatCurrency(cut.salePricePerKg),
    formatCurrency(cut.revenue),
    formatCurrency(cut.proportionalCost),
    formatCurrency(cut.profit),
    formatPercent(cut.marginPercent),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: COLORS.charcoal,
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLORS.wineDark,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [250, 247, 242],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28 },
      1: { cellWidth: 22 },
      2: { halign: "right", cellWidth: 18 },
      3: { halign: "right", cellWidth: 20 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 22 },
      6: { halign: "right", cellWidth: 22 },
      7: { halign: "right", cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const val = calc.cuts[data.row.index]?.profit ?? 0;
        if (val < 0) data.cell.styles.textColor = COLORS.danger;
        else data.cell.styles.textColor = COLORS.success;
      }
      if (data.section === "body" && data.column.index === 7) {
        const val = calc.cuts[data.row.index]?.marginPercent ?? 0;
        if (val < 0) data.cell.styles.textColor = COLORS.danger;
        else data.cell.styles.textColor = COLORS.success;
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION: Recomendações ---
  if (calc.recommendations.length > 0) {
    if (y + 40 > pageH - 25) {
      doc.addPage();
      y = 15;
    }

    y = drawSectionTitle(doc, "RECOMENDAÇÕES", margin, y, contentW);

    for (const rec of calc.recommendations) {
      if (y + 12 > pageH - 25) {
        doc.addPage();
        y = 15;
      }
      doc.setFillColor(250, 247, 242);
      doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gold);
      doc.text("•", margin + 4, y + 6.5);

      doc.setTextColor(...COLORS.charcoal);
      const lines = doc.splitTextToSize(rec, contentW - 16);
      const lineHeight = 4;
      const boxH = Math.max(10, lines.length * lineHeight + 4);

      doc.setFillColor(250, 247, 242);
      doc.roundedRect(margin, y, contentW, boxH, 2, 2, "F");
      doc.text(lines, margin + 10, y + 5.5);

      y += boxH + 3;
    }
  }

  // --- FOOTER ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFillColor(...COLORS.wineDark);
    doc.rect(0, pageH - 14, pageW, 14, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gold);
    doc.text("Lucro da Carne · Calculadora de rendimento, quebra e lucro para açougues", margin, pageH - 6);

    doc.setTextColor(...COLORS.white);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });

    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(0, pageH - 14, pageW, pageH - 14);
  }

  // --- DOWNLOAD ---
  const safeName = lot.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`relatorio-${safeName}.pdf`);
}

// --- Helpers ---

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number, w: number): number {
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(x, y, x + 12, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.wineDark);
  doc.text(title, x + 15, y + 0.5);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  const textW = doc.getTextWidth(title);
  doc.line(x + 17 + textW, y, x + w, y);

  return y + 7;
}

function drawKeyValueGrid(
  doc: jsPDF,
  data: [string, string][],
  x: number,
  y: number,
  w: number
): number {
  const cols = 2;
  const colW = w / cols;
  const rowH = 9;

  for (let i = 0; i < data.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * colW;
    const cy = y + row * rowH;

    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx + (col === 0 ? 0 : 2), cy, colW - 2, rowH - 1, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.warmGray);
    doc.text(data[i][0], cx + (col === 0 ? 4 : 6), cy + 3.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.charcoal);
    doc.text(data[i][1], cx + (col === 0 ? 4 : 6), cy + 7.5);
  }

  const rows = Math.ceil(data.length / cols);
  return y + rows * rowH + 2;
}

function drawHighlightBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  calc: LotCalculation
): number {
  const boxH = 20;
  const colW = w / 3;

  const items = [
    { label: "Custo real / kg vendável", value: formatCurrency(calc.realCostPerSellableKg), color: COLORS.gold },
    { label: "Receita prevista", value: formatCurrency(calc.expectedRevenue), color: COLORS.charcoal },
    {
      label: "Lucro bruto previsto",
      value: formatCurrency(calc.grossProfit),
      color: calc.grossProfit >= 0 ? COLORS.success : COLORS.danger,
    },
  ];

  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, boxH, 3, 3, "FD");

  items.forEach((item, i) => {
    const cx = x + i * colW + 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.warmGray);
    doc.text(item.label, cx, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.value, cx, y + 15);
  });

  return y + boxH;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}
