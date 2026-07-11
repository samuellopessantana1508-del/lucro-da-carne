import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";
import type { Database, Json } from "./database.types";
import type { Cut, Lot, LotType } from "./types";

type LotRow = Database["public"]["Tables"]["lots"]["Row"];
type LotInsert = Database["public"]["Tables"]["lots"]["Insert"];
type LotUpdate = Database["public"]["Tables"]["lots"]["Update"];

export function rowToLot(row: LotRow): Lot {
  return {
    id: row.id,
    name: row.name,
    type: row.type as LotType,
    supplier: row.supplier ?? "",
    date: row.date,
    inputWeightKg: Number(row.input_weight_kg),
    costPerKg: Number(row.cost_per_kg),
    totalCost: Number(row.total_cost),
    desiredMarginPercent: Number(row.desired_margin_percent),
    notes: row.notes ?? "",
    cuts: Array.isArray(row.cuts) ? (row.cuts as Cut[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cutsToJson(cuts: Cut[]): Json {
  return cuts as unknown as Json;
}

function lotToInsert(lot: Omit<Lot, "id" | "createdAt" | "updatedAt">, userId: string): LotInsert {
  return {
    user_id: userId,
    name: lot.name,
    type: lot.type,
    supplier: lot.supplier,
    date: lot.date,
    input_weight_kg: lot.inputWeightKg,
    cost_per_kg: lot.costPerKg,
    total_cost: lot.totalCost,
    desired_margin_percent: lot.desiredMarginPercent,
    notes: lot.notes,
    cuts: cutsToJson(lot.cuts),
  };
}

function lotToUpdate(updates: Partial<Lot>): LotUpdate {
  const payload: LotUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.supplier !== undefined) payload.supplier = updates.supplier;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.inputWeightKg !== undefined) payload.input_weight_kg = updates.inputWeightKg;
  if (updates.costPerKg !== undefined) payload.cost_per_kg = updates.costPerKg;
  if (updates.totalCost !== undefined) payload.total_cost = updates.totalCost;
  if (updates.desiredMarginPercent !== undefined) {
    payload.desired_margin_percent = updates.desiredMarginPercent;
  }
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.cuts !== undefined) payload.cuts = cutsToJson(updates.cuts);
  return payload;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function mapLotWriteError(error: unknown, fallback: string): Error {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("violates row-level security")
  ) {
    return new Error(
      `${fallback} Verifique se sua assinatura esta ativa ou se ainda ha usos gratis disponiveis.`
    );
  }

  return new Error(message || fallback);
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function fetchRemoteLots(userId: string): Promise<Lot[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToLot);
}

export async function insertRemoteLot(
  lot: Omit<Lot, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<Lot> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase
    .from("lots")
    .insert(lotToInsert(lot, userId))
    .select("*")
    .single();

  if (error) throw mapLotWriteError(error, "Nao foi possivel salvar o lote na nuvem.");
  return rowToLot(data);
}

export async function updateRemoteLot(id: string, updates: Partial<Lot>): Promise<Lot> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase
    .from("lots")
    .update(lotToUpdate(updates))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw mapLotWriteError(error, "Nao foi possivel atualizar o lote na nuvem.");
  return rowToLot(data);
}

export async function deleteRemoteLot(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { error } = await supabase.from("lots").delete().eq("id", id);
  if (error) throw mapLotWriteError(error, "Nao foi possivel excluir o lote na nuvem.");
}

export async function clearRemoteLots(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { error } = await supabase.from("lots").delete().eq("user_id", userId);
  if (error) throw mapLotWriteError(error, "Nao foi possivel limpar os lotes na nuvem.");
}
