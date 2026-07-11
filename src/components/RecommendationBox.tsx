"use client";

import { Lightbulb } from "lucide-react";

type RecommendationBoxProps = {
  recommendations: string[];
};

export default function RecommendationBox({ recommendations }: RecommendationBoxProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="card p-5 sm:p-6 animate-fade-in">
      <h3 className="text-lg font-bold text-[#4A0F14] mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-[#C89B3C]" />
        Recomendações
      </h3>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-[#F7F1E8]"
          >
            <span className="text-[#C89B3C] font-bold mt-0.5">•</span>
            <p className="text-sm text-[#1F1F1F]">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
