"use client";

import { type LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning" | "gold";
  subtitle?: string;
};

const VARIANT_STYLES = {
  default: "border-[#E5DED3]",
  success: "border-[#2F7D46]/30 bg-[#E8F5E9]",
  danger: "border-[#B23A3A]/30 bg-[#FFEBEE]",
  warning: "border-[#C89B3C]/30 bg-[#FFF8E1]",
  gold: "border-[#C89B3C]/30",
};

const ICON_STYLES = {
  default: "text-[#8A8178]",
  success: "text-[#2F7D46]",
  danger: "text-[#B23A3A]",
  warning: "text-[#C89B3C]",
  gold: "text-[#C89B3C]",
};

const VALUE_STYLES = {
  default: "text-[#1F1F1F]",
  success: "text-[#2F7D46]",
  danger: "text-[#B23A3A]",
  warning: "text-[#C89B3C]",
  gold: "text-[#C89B3C]",
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  subtitle,
}: MetricCardProps) {
  return (
    <div
      className={`card p-4 sm:p-5 ${VARIANT_STYLES[variant]} animate-fade-in`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-[#8A8178] uppercase tracking-wide">
            {label}
          </p>
          <p
            className={`text-xl sm:text-2xl font-bold mt-1 truncate ${VALUE_STYLES[variant]}`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#8A8178] mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`${ICON_STYLES[variant]} ml-3 flex-shrink-0`}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        )}
      </div>
    </div>
  );
}
