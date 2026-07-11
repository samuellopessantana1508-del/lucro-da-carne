"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { useLotsStore } from "@/hooks/useLots";
import { useAuth } from "@/hooks/useAuth";
import { calculateLot } from "@/lib/calculations";
import { formatCurrency, formatWeight, formatPercent, formatDateBR } from "@/lib/format";
import { generatePDF } from "@/lib/report-pdf";
import { LOT_TYPE_LABELS, STATUS_CONFIG } from "@/lib/constants";
import type { Lot, LotType, LotStatus } from "@/lib/types";
import {
  History,
  Eye,
  Copy,
  Trash2,
  Download,
  Filter,
  Search,
  Calculator,
  X,
} from "lucide-react";

export default function HistoricoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lots, loaded, loadedFor, error, loadLots, removeLot, copyLot } = useLotsStore();
  const userId = user?.id ?? null;
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterType, setFilterType] = useState<LotType | "">("");
  const [filterStatus, setFilterStatus] = useState<LotStatus | "">("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!loaded || loadedFor !== userId) void loadLots(userId);
  }, [loaded, loadedFor, loadLots, userId]);

  const suppliers = [...new Set(lots.map((l) => l.supplier).filter(Boolean))];

  const lotsWithCalcs = useMemo(
    () =>
      lots.map((lot) => ({
        lot,
        calc: calculateLot(lot.inputWeightKg, lot.totalCost, lot.desiredMarginPercent, lot.cuts),
      })),
    [lots]
  );

  const filtered = useMemo(
    () =>
      lotsWithCalcs.filter(({ lot, calc }) => {
        if (filterSupplier && lot.supplier !== filterSupplier) return false;
        if (filterType && lot.type !== filterType) return false;
        if (search && !lot.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus && calc.status !== filterStatus) return false;
        return true;
      }),
    [lotsWithCalcs, filterSupplier, filterType, search, filterStatus]
  );

  function handleDownloadPDF(lot: Lot) {
    const calc = calculateLot(lot.inputWeightKg, lot.totalCost, lot.desiredMarginPercent, lot.cuts);
    generatePDF(lot, calc);
  }

  async function handleDelete(id: string) {
    if (confirm("Tem certeza que deseja excluir este lote?")) {
      await removeLot(id);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#4A0F14]">Histórico de lotes</h1>
            <p className="text-sm text-[#8A8178] mt-1">{lots.length} lote(s) registrado(s)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-ghost text-sm ${showFilters ? "bg-[#E5DED3]" : ""}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            <button onClick={() => router.push("/calculadora")} className="btn-primary text-sm">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Novo lote</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card p-4 mb-6 animate-fade-in">
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#8A8178]">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8178]" />
                  <input
                    type="text"
                    className="input-field pl-9 text-sm"
                    placeholder="Nome do lote..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#8A8178]">Fornecedor</label>
                <select
                  className="select-field text-sm"
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                >
                  <option value="">Todos</option>
                  {suppliers.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#8A8178]">Tipo</label>
                <select
                  className="select-field text-sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as LotType | "")}
                >
                  <option value="">Todos</option>
                  {Object.entries(LOT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#8A8178]">Status</label>
                <select
                  className="select-field text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as LotStatus | "")}
                >
                  <option value="">Todos</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {(search || filterSupplier || filterType || filterStatus) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterSupplier("");
                  setFilterType("");
                  setFilterStatus("");
                }}
                className="btn-ghost text-xs mt-3"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {error ? (
          <div className="rounded-lg border border-[#B23A3A]/30 bg-[#FFEBEE] p-4 text-sm text-[#B23A3A]">
            {error}
          </div>
        ) : !loaded ? (
          <div className="text-center py-20 text-[#8A8178]">Carregando...</div>
        ) : lots.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhum lote salvo"
            description="Calcule e salve seu primeiro lote para começar a acompanhar seu histórico."
            action={{
              label: "Calcular primeiro lote",
              onClick: () => router.push("/calculadora"),
            }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Nenhum lote encontrado"
            description="Nenhum lote corresponde aos filtros selecionados."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(({ lot, calc }) => (
                <div
                  key={lot.id}
                  className="card p-4 sm:p-5 hover:shadow-md transition-shadow animate-fade-in"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#1F1F1F] truncate">{lot.name}</h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{
                            backgroundColor: STATUS_CONFIG[calc.status].bg,
                            color: STATUS_CONFIG[calc.status].color,
                          }}
                        >
                          {STATUS_CONFIG[calc.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-[#8A8178]">
                        {formatDateBR(lot.date)} • {LOT_TYPE_LABELS[lot.type]}
                        {lot.supplier && ` • ${lot.supplier}`}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 text-center flex-shrink-0">
                      <div>
                        <p className="text-xs text-[#8A8178]">Entrada</p>
                        <p className="text-sm font-semibold">{formatWeight(calc.inputWeightKg)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A8178]">Rendimento</p>
                        <p className="text-sm font-semibold">{formatPercent(calc.yieldPercent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A8178]">Receita</p>
                        <p className="text-sm font-semibold">{formatCurrency(calc.expectedRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A8178]">Lucro</p>
                        <p
                          className={`text-sm font-semibold ${
                            calc.grossProfit >= 0 ? "text-[#2F7D46]" : "text-[#B23A3A]"
                          }`}
                        >
                          {formatCurrency(calc.grossProfit)}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-[#8A8178]">Margem</p>
                        <p
                          className={`text-sm font-semibold ${
                            calc.grossMarginPercent >= 20 ? "text-[#2F7D46]" : calc.grossMarginPercent >= 10 ? "text-[#C89B3C]" : "text-[#B23A3A]"
                          }`}
                        >
                          {formatPercent(calc.grossMarginPercent)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/lote/${lot.id}`)}
                        className="p-2 text-[#8A8178] hover:text-[#7A1E24] transition-colors"
                        title="Ver detalhes"
                        aria-label="Ver detalhes do lote"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(lot)}
                        className="p-2 text-[#8A8178] hover:text-[#7A1E24] transition-colors"
                        title="Baixar PDF"
                        aria-label="Baixar relatório em PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => void copyLot(lot.id)}
                        className="p-2 text-[#8A8178] hover:text-[#7A1E24] transition-colors"
                        title="Duplicar"
                        aria-label="Duplicar lote"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(lot.id)}
                        className="p-2 text-[#8A8178] hover:text-[#B23A3A] transition-colors"
                        title="Excluir"
                        aria-label="Excluir lote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </>
  );
}
