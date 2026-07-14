"use client";

import { create } from "zustand";
import { Lot } from "@/lib/types";
import * as storage from "@/lib/storage";
import {
  clearRemoteLots,
  deleteRemoteLot,
  fetchRemoteLots,
  getCurrentUser,
  insertRemoteLot,
  updateRemoteLot,
} from "@/lib/lots-repository";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type LotsStore = {
  lots: Lot[];
  loaded: boolean;
  loadedFor: string | null;
  error: string | null;
  loadLots: (userId?: string | null) => Promise<void>;
  addLot: (lot: Omit<Lot, "id" | "createdAt" | "updatedAt">) => Promise<Lot>;
  removeLot: (id: string) => Promise<void>;
  editLot: (id: string, updates: Partial<Lot>) => Promise<void>;
  copyLot: (id: string) => Promise<Lot | undefined>;
  clearAll: () => Promise<void>;
  importLocalLotsToCloud: () => Promise<number>;
};

async function getRemoteUserId(): Promise<string | null> {
  if (!getSupabaseBrowserClient()) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}

function requireAuthenticatedCloudUser(userId: string | null): void {
  if (getSupabaseBrowserClient() && !userId) {
    throw new Error("Entre na sua conta para usar e salvar a calculadora.");
  }
}

export const useLotsStore = create<LotsStore>((set, get) => ({
  lots: [],
  loaded: false,
  loadedFor: null,
  error: null,

  loadLots: async (userId = null) => {
    try {
      const cloudClient = getSupabaseBrowserClient();
      if (cloudClient && userId) {
        const lots = await fetchRemoteLots(userId);
        set({ lots, loaded: true, loadedFor: userId, error: null });
        return;
      }

      if (cloudClient) {
        set({ lots: [], loaded: true, loadedFor: null, error: null });
        return;
      }

      const lots = storage.getLots();
      set({ lots, loaded: true, loadedFor: null, error: null });
    } catch (error) {
      set({
        loaded: true,
        error: error instanceof Error ? error.message : "Nao foi possivel carregar os lotes.",
      });
    }
  },

  addLot: async (lot) => {
    const userId = await getRemoteUserId();
    requireAuthenticatedCloudUser(userId);

    if (userId) {
      const saved = await insertRemoteLot(lot, userId);
      set((state) => ({ lots: [saved, ...state.lots], loaded: true, loadedFor: userId }));
      return saved;
    }

    const saved = storage.saveLot(lot);
    set({ lots: storage.getLots(), loaded: true, loadedFor: null });
    return saved;
  },

  removeLot: async (id) => {
    const userId = await getRemoteUserId();
    requireAuthenticatedCloudUser(userId);

    if (userId) {
      await deleteRemoteLot(id);
      set((state) => ({ lots: state.lots.filter((lot) => lot.id !== id), loadedFor: userId }));
      return;
    }

    storage.deleteLot(id);
    set({ lots: storage.getLots(), loadedFor: null });
  },

  editLot: async (id, updates) => {
    const userId = await getRemoteUserId();
    requireAuthenticatedCloudUser(userId);

    if (userId) {
      const updated = await updateRemoteLot(id, updates);
      set((state) => ({
        lots: state.lots.map((lot) => (lot.id === id ? updated : lot)),
        loadedFor: userId,
      }));
      return;
    }

    storage.updateLot(id, updates);
    set({ lots: storage.getLots(), loadedFor: null });
  },

  copyLot: async (id) => {
    const userId = await getRemoteUserId();
    requireAuthenticatedCloudUser(userId);

    if (userId) {
      const lot = get().lots.find((item) => item.id === id);
      if (!lot) return undefined;
      const dup = await insertRemoteLot(
        {
          ...lot,
          name: `${lot.name} (copia)`,
          cuts: lot.cuts.map((cut) => ({ ...cut, id: storage.generateId() })),
        },
        userId
      );
      set((state) => ({ lots: [dup, ...state.lots], loadedFor: userId }));
      return dup;
    }

    const dup = storage.duplicateLot(id);
    if (dup) set({ lots: storage.getLots(), loadedFor: null });
    return dup;
  },

  clearAll: async () => {
    const userId = await getRemoteUserId();
    requireAuthenticatedCloudUser(userId);

    if (userId) {
      await clearRemoteLots(userId);
      set({ lots: [], loaded: true, loadedFor: userId });
      return;
    }

    storage.clearAllData();
    set({ lots: [], loaded: true, loadedFor: null });
  },

  importLocalLotsToCloud: async () => {
    const userId = await getRemoteUserId();
    if (!userId) return 0;

    const localLots = storage.getLots();
    for (const lot of localLots) {
      await insertRemoteLot(
        {
          name: lot.name,
          type: lot.type,
          supplier: lot.supplier,
          date: lot.date,
          inputWeightKg: lot.inputWeightKg,
          costPerKg: lot.costPerKg,
          totalCost: lot.totalCost,
          desiredMarginPercent: lot.desiredMarginPercent,
          notes: lot.notes,
          cuts: lot.cuts,
        },
        userId
      );
    }

    storage.clearLocalLots();
    const lots = await fetchRemoteLots(userId);
    set({ lots, loaded: true, loadedFor: userId });
    return localLots.length;
  },
}));
