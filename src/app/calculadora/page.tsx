"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import MetricCard from "@/components/MetricCard";
import AlertBox from "@/components/AlertBox";
import RecommendationBox from "@/components/RecommendationBox";
import { calculateLot } from "@/lib/calculations";
import { formatCurrency, formatWeight, formatPercent, todayISO } from "@/lib/format";
import { generateReport } from "@/lib/report";
import { generatePDF } from "@/lib/report-pdf";
import { generateId } from "@/lib/storage";
import { useLotsStore } from "@/hooks/useLots";
import {
  LOT_TYPE_LABELS,
  CUT_CATEGORY_LABELS,
  SUGGESTED_CUTS,
  EXAMPLE_LOT,
  STATUS_CONFIG,
  DEFAULT_DESIRED_MARGIN,
} from "@/lib/constants";
import type { Cut, LotType, CutCategory, LotCalculation } from "@/lib/types";
import {
  Plus,
  Trash2,
  Copy,
  Calculator,
  Save,
  FileText,
  Download,
  RefreshCw,
  Scale,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Weight,
  Target,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

export default function CalculadoraPage() {
  return (
    <Suspense fallback={<><Header /><main className="flex-1 flex items-center justify-center"><p className="text-[#8A8178]">Carregando...</p></main></>}>
      <CalculadoraContent />
    </Suspense>
  );
}

function numInput(value: number, onChange: (v: number) => void, placeholder?: string) {
  return (
    <input
      type="text"
      inputMode="decimal"
      className="input-field"
      placeholder={placeholder}
      value={value > 0 ? String(value).replace(".", ",") : ""}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        const n = parseFloat(raw);
        onChange(isNaN(n) ? 0 : n);
      }}
    />
  );
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildExampleCuts(): Cut[] {
  return EXAMPLE_LOT.cuts.map((c) => ({
    ...c,
    id: generateId(),
  }));
}

function CalculadoraContent() {
  const searchParams = useSearchParams();
  const startsWithExample = searchParams.get("exemplo") === "1";
  const addLot = useLotsStore((s) => s.addLot);

  const [name, setName] = useState(() => (startsWithExample ? EXAMPLE_LOT.name : ""));
  const [type, setType] = useState<LotType>(() =>
    startsWithExample ? EXAMPLE_LOT.type : "traseiro"
  );
  const [supplier, setSupplier] = useState(() => (startsWithExample ? EXAMPLE_LOT.supplier : ""));
  const [date, setDate] = useState(todayISO());
  const [inputWeight, setInputWeight] = useState(() =>
    startsWithExample ? EXAMPLE_LOT.inputWeightKg : 0
  );
  const [costPerKg, setCostPerKg] = useState(() =>
    startsWithExample ? EXAMPLE_LOT.costPerKg : 0
  );
  const [totalCost, setTotalCost] = useState(() =>
    startsWithExample ? EXAMPLE_LOT.totalCost : 0
  );
  const [desiredMargin, setDesiredMargin] = useState(() =>
    startsWithExample ? EXAMPLE_LOT.desiredMarginPercent : DEFAULT_DESIRED_MARGIN
  );
  const [notes, setNotes] = useState(() => (startsWithExample ? EXAMPLE_LOT.notes : ""));
  const [cuts, setCuts] = useState<Cut[]>(() => (startsWithExample ? buildExampleCuts() : []));
  const [calculation, setCalculation] = useState<LotCalculation | null>(null);
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [costMode, setCostMode] = useState<"perkg" | "total">("perkg");

  const loadExample = useCallback(() => {
    setName(EXAMPLE_LOT.name);
    setType(EXAMPLE_LOT.type);
    setSupplier(EXAMPLE_LOT.supplier);
    setDate(todayISO());
    setInputWeight(EXAMPLE_LOT.inputWeightKg);
    setCostPerKg(EXAMPLE_LOT.costPerKg);
    setTotalCost(EXAMPLE_LOT.totalCost);
    setDesiredMargin(EXAMPLE_LOT.desiredMarginPercent);
    setNotes(EXAMPLE_LOT.notes);
    setCuts(buildExampleCuts());
    setCostMode("perkg");
  }, []);

  function handleInputWeightChange(value: number) {
    setInputWeight(value);
    if (costMode === "perkg" && value > 0 && costPerKg > 0) {
      setTotalCost(roundMoney(value * costPerKg));
    }
    if (costMode === "total" && value > 0 && totalCost > 0) {
      setCostPerKg(roundMoney(totalCost / value));
    }
  }

  function handleCostPerKgChange(value: number) {
    setCostMode("perkg");
    setCostPerKg(value);
    setTotalCost(inputWeight > 0 && value > 0 ? roundMoney(inputWeight * value) : 0);
  }

  function handleTotalCostChange(value: number) {
    setCostMode("total");
    setTotalCost(value);
    setCostPerKg(inputWeight > 0 && value > 0 ? roundMoney(value / inputWeight) : 0);
  }

  function addCut(suggestion?: { name: string; category: CutCategory }) {
    setCuts((prev) => [
      ...prev,
      {
        id: generateId(),
        name: suggestion?.name || "",
        category: suggestion?.category || "corte_comum",
        weightKg: 0,
        salePricePerKg: 0,
      },
    ]);
  }

  function updateCut(id: string, updates: Partial<Cut>) {
    setCuts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function removeCut(id: string) {
    setCuts((prev) => prev.filter((c) => c.id !== id));
  }

  function duplicateCut(id: string) {
    const cut = cuts.find((c) => c.id === id);
    if (cut) {
      setCuts((prev) => [...prev, { ...cut, id: generateId() }]);
    }
  }

  function doCalculate() {
    if (inputWeight <= 0 || totalCost <= 0 || cuts.length === 0) return;
    const result = calculateLot(inputWeight, totalCost, desiredMargin, cuts);
    setCalculation(result);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function doSave() {
    setSaving(true);
    setSaveError(null);

    try {
      await addLot({
        name: name || `Lote ${new Date().toLocaleDateString("pt-BR")}`,
        type,
        supplier,
        date,
        inputWeightKg: inputWeight,
        costPerKg,
        totalCost,
        desiredMarginPercent: desiredMargin,
        notes,
        cuts,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Nao foi possivel salvar o lote.");
    } finally {
      setSaving(false);
    }
  }

  function buildLotObject() {
    return {
      id: "",
      name: name || "Lote sem nome",
      type,
      supplier,
      date,
      inputWeightKg: inputWeight,
      costPerKg,
      totalCost,
      desiredMarginPercent: desiredMargin,
      notes,
      cuts,
      createdAt: "",
      updatedAt: "",
    };
  }

  function doCopyReport() {
    if (!calculation) return;
    const report = generateReport(buildLotObject(), calculation);
    try {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback: create textarea
      const ta = document.createElement("textarea");
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function doDownloadPDF() {
    if (!calculation) return;
    generatePDF(buildLotObject(), calculation);
  }

  function doReset() {
    setName("");
    setType("traseiro");
    setSupplier("");
    setDate(todayISO());
    setInputWeight(0);
    setCostPerKg(0);
    setTotalCost(0);
    setDesiredMargin(DEFAULT_DESIRED_MARGIN);
    setNotes("");
    setCuts([]);
    setCalculation(null);
    setStep(1);
    setSaved(false);
    setSaveError(null);
  }

  const totalCutsWeight = cuts.reduce((s, c) => s + c.weightKg, 0);
  const canCalculate = inputWeight > 0 && totalCost > 0 && cuts.length > 0 && cuts.some((c) => c.weightKg > 0);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "Dados do lote" },
            { n: 2, label: "Cortes" },
            { n: 3, label: "Resultado" },
          ].map(({ n, label }) => (
            <button
              key={n}
              onClick={() => (n <= 2 || calculation) && setStep(n)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === n
                  ? "bg-[#7A1E24] text-white"
                  : step > n
                  ? "bg-[#E8F5E9] text-[#2F7D46]"
                  : "bg-white text-[#8A8178] border border-[#E5DED3]"
              }`}
            >
              {step > n ? <CheckCircle className="w-4 h-4" /> : <span>{n}</span>}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={loadExample} className="btn-ghost text-sm">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Carregar exemplo</span>
          </button>
        </div>

        {/* Step 1: Dados do lote */}
        {step === 1 && (
          <div className="card p-5 sm:p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-[#4A0F14] mb-6">Quanto entrou de carne?</h2>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Nome do lote</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Traseiro bovino 09/07"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Tipo de compra</label>
                <select
                  className="select-field"
                  value={type}
                  onChange={(e) => setType(e.target.value as LotType)}
                >
                  {Object.entries(LOT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fornecedor</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nome do fornecedor"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Data da compra</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Peso de entrada (kg)</label>
                {numInput(inputWeight, handleInputWeightChange, "Ex: 120")}
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  Modo de custo
                  <button
                    type="button"
                    onClick={() => setCostMode(costMode === "perkg" ? "total" : "perkg")}
                    className="text-xs text-[#7A1E24] underline font-normal"
                  >
                    {costMode === "perkg" ? "Informar custo total" : "Informar custo por kg"}
                  </button>
                </label>
                {costMode === "perkg" ? (
                  <>
                    {numInput(costPerKg, handleCostPerKgChange, "R$/kg")}
                    {totalCost > 0 && (
                      <p className="text-xs text-[#8A8178] mt-1">
                        Custo total: {formatCurrency(totalCost)}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {numInput(totalCost, handleTotalCostChange, "R$ total")}
                    {costPerKg > 0 && (
                      <p className="text-xs text-[#8A8178] mt-1">
                        Custo por kg: {formatCurrency(costPerKg)}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="label">Margem desejada (%)</label>
                {numInput(desiredMargin, setDesiredMargin, "30")}
              </div>
              <div>
                <label className="label">Observações</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Opcional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(2)}
                disabled={inputWeight <= 0 || totalCost <= 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo: Cortes
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Cortes */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div className="card p-5 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#4A0F14]">Quanto saiu de cada corte?</h2>
                  <p className="text-sm text-[#8A8178] mt-1">
                    Peso de entrada: {formatWeight(inputWeight)} | Registrado:{" "}
                    {formatWeight(totalCutsWeight)}
                    {totalCutsWeight > inputWeight * 1.01 && (
                      <span className="text-[#B23A3A] font-semibold"> (acima do peso de entrada!)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick add suggestions */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-[#8A8178] uppercase tracking-wide mb-2">
                  Adicionar corte rápido:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_CUTS.filter(
                    (s) => !cuts.some((c) => c.name === s.name)
                  )
                    .slice(0, 12)
                    .map((s) => (
                      <button
                        key={s.name}
                        onClick={() => addCut(s)}
                        className="text-xs px-3 py-1.5 rounded-full bg-white border border-[#E5DED3] text-[#1F1F1F] hover:border-[#7A1E24] hover:text-[#7A1E24] transition-colors"
                      >
                        + {s.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Cuts list */}
              <div className="space-y-3">
                {cuts.map((cut) => (
                  <div
                    key={cut.id}
                    className="p-4 rounded-lg bg-[#F7F1E8] border border-[#E5DED3]"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                      <div className="col-span-2 sm:col-span-3">
                        <label className="text-xs font-semibold text-[#8A8178]">Corte</label>
                        <input
                          type="text"
                          className="input-field text-sm"
                          placeholder="Nome do corte"
                          value={cut.name}
                          onChange={(e) => updateCut(cut.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <label className="text-xs font-semibold text-[#8A8178]">Categoria</label>
                        <select
                          className="select-field text-sm"
                          value={cut.category}
                          onChange={(e) =>
                            updateCut(cut.id, { category: e.target.value as CutCategory })
                          }
                        >
                          {Object.entries(CUT_CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#8A8178]">Peso (kg)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="input-field text-sm"
                          placeholder="0,00"
                          value={cut.weightKg > 0 ? String(cut.weightKg).replace(".", ",") : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value.replace(",", "."));
                            updateCut(cut.id, { weightKg: isNaN(v) ? 0 : v });
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#8A8178]">R$/kg</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="input-field text-sm"
                          placeholder="0,00"
                          value={
                            cut.salePricePerKg > 0
                              ? String(cut.salePricePerKg).replace(".", ",")
                              : ""
                          }
                          onChange={(e) => {
                            const v = parseFloat(e.target.value.replace(",", "."));
                            updateCut(cut.id, { salePricePerKg: isNaN(v) ? 0 : v });
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end gap-1">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-[#8A8178]">Receita</label>
                          <p className="text-sm font-semibold text-[#1F1F1F] py-2.5">
                            {formatCurrency(cut.weightKg * cut.salePricePerKg)}
                          </p>
                        </div>
                        <button
                          onClick={() => duplicateCut(cut.id)}
                          className="p-2 text-[#8A8178] hover:text-[#7A1E24] transition-colors"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeCut(cut.id)}
                          className="p-2 text-[#8A8178] hover:text-[#B23A3A] transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={() => addCut()} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4" />
                  Adicionar corte
                </button>
                {cuts.length > 0 && (
                  <button
                    onClick={() => setCuts([])}
                    className="btn-ghost text-sm text-[#B23A3A]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar lista
                  </button>
                )}
              </div>
            </div>

            {totalCutsWeight > inputWeight * 1.01 && (
              <AlertBox
                type="error"
                message={`O peso total dos cortes (${formatWeight(totalCutsWeight)}) ultrapassa o peso de entrada (${formatWeight(inputWeight)}). Verifique os valores.`}
              />
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">
                <ChevronUp className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={doCalculate}
                disabled={!canCalculate}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calculator className="w-4 h-4" />
                Calcular lote
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Resultado */}
        {step === 3 && calculation && (
          <div className="animate-fade-in space-y-6">
            {/* Status badge */}
            <div className="card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#4A0F14]">
                    {name || "Resultado do lote"}
                  </h2>
                  <p className="text-sm text-[#8A8178] mt-1">
                    {supplier && `${supplier} • `}
                    {LOT_TYPE_LABELS[type]}
                  </p>
                </div>
                <div
                  className="px-4 py-2 rounded-full font-bold text-sm"
                  style={{
                    backgroundColor: STATUS_CONFIG[calculation.status].bg,
                    color: STATUS_CONFIG[calculation.status].color,
                  }}
                >
                  {calculation.status === "prejuizo" ? "⚠ " : ""}
                  {STATUS_CONFIG[calculation.status].label}
                  {" · "}
                  {formatPercent(calculation.grossMarginPercent)} de margem
                </div>
              </div>
            </div>

            {/* Warnings */}
            {calculation.warnings.map((w, i) => (
              <AlertBox key={i} type="warning" message={w} />
            ))}

            {/* Main metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Custo total"
                value={formatCurrency(calculation.totalCost)}
                icon={DollarSign}
              />
              <MetricCard
                label="Peso de entrada"
                value={formatWeight(calculation.inputWeightKg)}
                icon={Weight}
              />
              <MetricCard
                label="Peso vendável"
                value={formatWeight(calculation.sellableWeightKg)}
                icon={Scale}
                subtitle={`Rendimento: ${formatPercent(calculation.yieldPercent)}`}
              />
              <MetricCard
                label="Quebra / Perda"
                value={formatWeight(calculation.lossWeightKg)}
                icon={TrendingDown}
                variant={calculation.lossPercent > 25 ? "danger" : "default"}
                subtitle={`Quebra: ${formatPercent(calculation.lossPercent)}`}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Custo original / kg"
                value={formatCurrency(calculation.originalCostPerKg)}
                icon={DollarSign}
              />
              <MetricCard
                label="Custo real / kg vendável"
                value={formatCurrency(calculation.realCostPerSellableKg)}
                icon={Target}
                variant="gold"
              />
              <MetricCard
                label="Receita prevista"
                value={formatCurrency(calculation.expectedRevenue)}
                icon={TrendingUp}
              />
              <MetricCard
                label="Lucro bruto previsto"
                value={formatCurrency(calculation.grossProfit)}
                icon={DollarSign}
                variant={calculation.grossProfit >= 0 ? "success" : "danger"}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                label="Margem bruta"
                value={formatPercent(calculation.grossMarginPercent)}
                icon={Percent}
                variant={
                  calculation.grossMarginPercent >= 20
                    ? "success"
                    : calculation.grossMarginPercent >= 10
                    ? "warning"
                    : "danger"
                }
              />
              <MetricCard
                label="Preço mínimo sugerido / kg"
                value={formatCurrency(calculation.suggestedMinimumPricePerKg)}
                icon={Target}
                subtitle={`Para margem de ${formatPercent(desiredMargin)}`}
                variant="gold"
              />
              <MetricCard
                label="Rendimento"
                value={formatPercent(calculation.yieldPercent)}
                icon={Scale}
                variant={
                  calculation.yieldPercent >= 75
                    ? "success"
                    : calculation.yieldPercent >= 60
                    ? "warning"
                    : "danger"
                }
              />
            </div>

            {/* Cuts detail */}
            <div className="card p-5 sm:p-6">
              <h3 className="text-lg font-bold text-[#4A0F14] mb-4">Lucro por corte</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5DED3]">
                      <th className="text-left py-3 px-2 text-[#8A8178] font-semibold">Corte</th>
                      <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Peso</th>
                      <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">R$/kg</th>
                      <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Receita</th>
                      <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Custo</th>
                      <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Lucro</th>
                      <th className="text-right py-3 px-2 text-[#8A8178] font-semibold">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.cuts.map((cut) => (
                      <tr key={cut.cutId} className="border-b border-[#E5DED3]/50 hover:bg-[#F7F1E8]">
                        <td className="py-3 px-2 font-medium">{cut.name || "-"}</td>
                        <td className="py-3 px-2 text-right">{formatWeight(cut.weightKg)}</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(cut.salePricePerKg)}</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(cut.revenue)}</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(cut.proportionalCost)}</td>
                        <td
                          className={`py-3 px-2 text-right font-semibold ${
                            cut.profit >= 0 ? "text-[#2F7D46]" : "text-[#B23A3A]"
                          }`}
                        >
                          {formatCurrency(cut.profit)}
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-semibold ${
                            cut.marginPercent >= 0 ? "text-[#2F7D46]" : "text-[#B23A3A]"
                          }`}
                        >
                          {formatPercent(cut.marginPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            <RecommendationBox recommendations={calculation.recommendations} />

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={doSave}
                disabled={saving}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar lote"}
              </button>
              <button onClick={doDownloadPDF} className="btn-secondary">
                <Download className="w-4 h-4" />
                Baixar PDF
              </button>
              <button onClick={doCopyReport} className="btn-ghost">
                <FileText className="w-4 h-4" />
                {copied ? "Copiado!" : "Copiar relatório"}
              </button>
              <button onClick={() => setStep(2)} className="btn-ghost">
                <ChevronUp className="w-4 h-4" />
                Editar cortes
              </button>
              <button onClick={doReset} className="btn-ghost">
                <RefreshCw className="w-4 h-4" />
                Novo cálculo
              </button>
            </div>
            {saveError && <AlertBox type="error" message={saveError} />}
          </div>
        )}
      </main>
    </>
  );
}
