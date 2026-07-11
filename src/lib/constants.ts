import { LotType, CutCategory } from "./types";

export const LOT_TYPE_LABELS: Record<LotType, string> = {
  traseiro: "Traseiro",
  dianteiro: "Dianteiro",
  boi_casado: "Boi casado",
  meia_carcaca: "Meia carcaça",
  peca_individual: "Peça individual",
  caixa: "Caixa de carne",
  outro: "Outro",
};

export const CUT_CATEGORY_LABELS: Record<CutCategory, string> = {
  corte_nobre: "Corte nobre",
  corte_comum: "Corte comum",
  moida: "Moída",
  osso: "Osso",
  sebo: "Sebo",
  retalho: "Retalho",
  perda: "Perda",
  outro: "Outro",
};

export const SUGGESTED_CUTS: { name: string; category: CutCategory }[] = [
  { name: "Picanha", category: "corte_nobre" },
  { name: "Alcatra", category: "corte_nobre" },
  { name: "Contrafilé", category: "corte_nobre" },
  { name: "Filé mignon", category: "corte_nobre" },
  { name: "Patinho", category: "corte_comum" },
  { name: "Coxão mole", category: "corte_comum" },
  { name: "Coxão duro", category: "corte_comum" },
  { name: "Acém", category: "corte_comum" },
  { name: "Paleta", category: "corte_comum" },
  { name: "Peito", category: "corte_comum" },
  { name: "Costela", category: "corte_comum" },
  { name: "Músculo", category: "corte_comum" },
  { name: "Fraldinha", category: "corte_comum" },
  { name: "Cupim", category: "corte_comum" },
  { name: "Moída", category: "moida" },
  { name: "Osso", category: "osso" },
  { name: "Sebo", category: "sebo" },
  { name: "Retalho", category: "retalho" },
  { name: "Perda", category: "perda" },
];

export const STATUS_CONFIG = {
  excelente: { label: "Excelente", color: "#2F7D46", bg: "#E8F5E9" },
  saudavel: { label: "Saudável", color: "#2F7D46", bg: "#F1F8E9" },
  atencao: { label: "Atenção", color: "#C89B3C", bg: "#FFF8E1" },
  risco: { label: "Risco", color: "#B23A3A", bg: "#FFF3E0" },
  prejuizo: { label: "Prejuízo", color: "#B23A3A", bg: "#FFEBEE" },
};

export const EXAMPLE_LOT = {
  name: "Traseiro bovino (Exemplo)",
  type: "traseiro" as LotType,
  supplier: "Frigorífico Modelo",
  inputWeightKg: 120,
  costPerKg: 22,
  totalCost: 2640,
  desiredMarginPercent: 30,
  notes: "Lote de exemplo para demonstração",
  cuts: [
    { name: "Picanha", category: "corte_nobre" as CutCategory, weightKg: 4, salePricePerKg: 79.9 },
    { name: "Alcatra", category: "corte_nobre" as CutCategory, weightKg: 12, salePricePerKg: 49.9 },
    { name: "Contrafilé", category: "corte_nobre" as CutCategory, weightKg: 10, salePricePerKg: 54.9 },
    { name: "Patinho", category: "corte_comum" as CutCategory, weightKg: 11, salePricePerKg: 42.9 },
    { name: "Coxão mole", category: "corte_comum" as CutCategory, weightKg: 9, salePricePerKg: 44.9 },
    { name: "Coxão duro", category: "corte_comum" as CutCategory, weightKg: 8, salePricePerKg: 39.9 },
    { name: "Músculo", category: "corte_comum" as CutCategory, weightKg: 7, salePricePerKg: 32.9 },
    { name: "Moída", category: "moida" as CutCategory, weightKg: 18, salePricePerKg: 29.9 },
    { name: "Osso", category: "osso" as CutCategory, weightKg: 10, salePricePerKg: 5 },
    { name: "Sebo/perda", category: "sebo" as CutCategory, weightKg: 12, salePricePerKg: 0 },
  ],
};

export const DEFAULT_DESIRED_MARGIN = 30;
