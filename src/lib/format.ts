export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatWeight(kg: number): string {
  return kg.toFixed(2).replace(".", ",") + " kg";
}

export function formatPercent(value: number): string {
  return value.toFixed(1).replace(".", ",") + "%";
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

export function parseBRNumber(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatDateBR(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("pt-BR");
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
