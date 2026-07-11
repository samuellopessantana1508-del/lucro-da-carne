export type LotType =
  | "traseiro"
  | "dianteiro"
  | "boi_casado"
  | "meia_carcaca"
  | "peca_individual"
  | "caixa"
  | "outro";

export type CutCategory =
  | "corte_nobre"
  | "corte_comum"
  | "moida"
  | "osso"
  | "sebo"
  | "retalho"
  | "perda"
  | "outro";

export type LotStatus = "excelente" | "saudavel" | "atencao" | "risco" | "prejuizo";

export type Cut = {
  id: string;
  name: string;
  category: CutCategory;
  weightKg: number;
  salePricePerKg: number;
};

export type Lot = {
  id: string;
  name: string;
  type: LotType;
  supplier: string;
  date: string;
  inputWeightKg: number;
  costPerKg: number;
  totalCost: number;
  desiredMarginPercent: number;
  notes: string;
  cuts: Cut[];
  createdAt: string;
  updatedAt: string;
};

export type CutCalculation = {
  cutId: string;
  name: string;
  category: CutCategory;
  weightKg: number;
  salePricePerKg: number;
  revenue: number;
  proportionalCost: number;
  profit: number;
  marginPercent: number;
};

export type LotCalculation = {
  totalCost: number;
  inputWeightKg: number;
  totalCutsWeightKg: number;
  sellableWeightKg: number;
  lossWeightKg: number;
  yieldPercent: number;
  lossPercent: number;
  originalCostPerKg: number;
  realCostPerSellableKg: number;
  expectedRevenue: number;
  grossProfit: number;
  grossMarginPercent: number;
  suggestedMinimumPricePerKg: number;
  status: LotStatus;
  cuts: CutCalculation[];
  warnings: string[];
  recommendations: string[];
};

export type UserPreferences = {
  defaultDesiredMargin: number;
  lastSupplier: string;
  customCuts: string[];
};
