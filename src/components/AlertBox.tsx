"use client";

import { AlertTriangle, Info, CheckCircle } from "lucide-react";

type AlertBoxProps = {
  type: "warning" | "error" | "success" | "info";
  message: string;
};

const CONFIG = {
  warning: {
    bg: "bg-[#FFF8E1]",
    border: "border-[#C89B3C]/30",
    text: "text-[#8B6914]",
    icon: AlertTriangle,
    iconColor: "text-[#C89B3C]",
  },
  error: {
    bg: "bg-[#FFEBEE]",
    border: "border-[#B23A3A]/30",
    text: "text-[#B23A3A]",
    icon: AlertTriangle,
    iconColor: "text-[#B23A3A]",
  },
  success: {
    bg: "bg-[#E8F5E9]",
    border: "border-[#2F7D46]/30",
    text: "text-[#2F7D46]",
    icon: CheckCircle,
    iconColor: "text-[#2F7D46]",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: Info,
    iconColor: "text-blue-500",
  },
};

export default function AlertBox({ type, message }: AlertBoxProps) {
  const c = CONFIG[type];
  const Icon = c.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${c.bg} ${c.border} animate-fade-in`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.iconColor}`} />
      <p className={`text-sm ${c.text}`}>{message}</p>
    </div>
  );
}
