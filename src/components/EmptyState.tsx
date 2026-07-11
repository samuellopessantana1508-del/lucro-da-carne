"use client";

import { type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F7F1E8] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#8A8178]" />
      </div>
      <h3 className="text-lg font-semibold text-[#4A0F14] mb-2">{title}</h3>
      <p className="text-sm text-[#8A8178] max-w-sm mb-6">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
