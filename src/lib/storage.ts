import { Lot, UserPreferences } from "./types";
import { DEFAULT_DESIRED_MARGIN } from "./constants";

const LOTS_KEY = "lucro-da-carne-lots";
const PREFS_KEY = "lucro-da-carne-prefs";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn("Não foi possível salvar os dados. O armazenamento local pode estar cheio.");
    return false;
  }
}

export function getLots(): Lot[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getLotById(id: string): Lot | undefined {
  return getLots().find((lot) => lot.id === id);
}

export function saveLot(lot: Omit<Lot, "id" | "createdAt" | "updatedAt">): Lot {
  const lots = getLots();
  const now = new Date().toISOString();
  const newLot: Lot = {
    ...lot,
    id: generateId(),
    cuts: lot.cuts.map((c) => ({ ...c, id: c.id || generateId() })),
    createdAt: now,
    updatedAt: now,
  };
  lots.unshift(newLot);
  safeSetItem(LOTS_KEY, JSON.stringify(lots));
  return newLot;
}

export function updateLot(id: string, updates: Partial<Lot>): Lot | undefined {
  const lots = getLots();
  const index = lots.findIndex((l) => l.id === id);
  if (index === -1) return undefined;
  lots[index] = { ...lots[index], ...updates, updatedAt: new Date().toISOString() };
  safeSetItem(LOTS_KEY, JSON.stringify(lots));
  return lots[index];
}

export function deleteLot(id: string): boolean {
  const lots = getLots();
  const filtered = lots.filter((l) => l.id !== id);
  if (filtered.length === lots.length) return false;
  safeSetItem(LOTS_KEY, JSON.stringify(filtered));
  return true;
}

export function duplicateLot(id: string): Lot | undefined {
  const lot = getLotById(id);
  if (!lot) return undefined;
  return saveLot({
    ...lot,
    name: lot.name + " (cópia)",
    cuts: lot.cuts.map((c) => ({ ...c, id: generateId() })),
  });
}

export function clearAllData(): void {
  try {
    localStorage.removeItem(LOTS_KEY);
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // ignore
  }
}

export function clearLocalLots(): void {
  try {
    localStorage.removeItem(LOTS_KEY);
  } catch {
    // ignore
  }
}

export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return { defaultDesiredMargin: DEFAULT_DESIRED_MARGIN, lastSupplier: "", customCuts: [] };
  }
  try {
    const data = localStorage.getItem(PREFS_KEY);
    return data
      ? JSON.parse(data)
      : { defaultDesiredMargin: DEFAULT_DESIRED_MARGIN, lastSupplier: "", customCuts: [] };
  } catch {
    return { defaultDesiredMargin: DEFAULT_DESIRED_MARGIN, lastSupplier: "", customCuts: [] };
  }
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  safeSetItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

export { generateId };
