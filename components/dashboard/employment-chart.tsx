"use client";

import { useState } from "react";

export function EmploymentChart({
  fulltime,
  freelance,
}: {
  fulltime: number;
  freelance: number;
}) {
  const [hovered, setHovered] = useState<null | "fulltime" | "freelance">(null);

  const total = fulltime + freelance;
  const fulltimePercent = total > 0 ? (fulltime / total) * 100 : 0;
  const freelancePercent = total > 0 ? (freelance / total) * 100 : 0;
  const dash1 = (fulltimePercent / 100) * 220;
  const dash2 = (freelancePercent / 100) * 220;

  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        <circle cx="50" cy="50" r="35" fill="none" stroke="#e0e7ff" strokeWidth="18" />
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="none"
          stroke="#5a67d8"
          strokeWidth="18"
          strokeDasharray={`${dash1} 220`}
          onMouseEnter={() => setHovered("fulltime")}
          onMouseLeave={() => setHovered(null)}
          className="cursor-pointer transition-opacity duration-150"
          style={{ opacity: hovered === "freelance" ? 0.35 : 1 }}
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="none"
          stroke="#f56565"
          strokeWidth="18"
          strokeDasharray={`${dash2} 220`}
          strokeDashoffset={`-${dash1}`}
          onMouseEnter={() => setHovered("freelance")}
          onMouseLeave={() => setHovered(null)}
          className="cursor-pointer transition-opacity duration-150"
          style={{ opacity: hovered === "fulltime" ? 0.35 : 1 }}
        />
      </svg>

      {hovered === "fulltime" && dash1 > 0 && (
        <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 flex items-center bg-white/95 shadow-[0_4px_14px_-4px_rgba(16,24,40,0.25)] rounded-lg border border-gray-100 px-2.5 py-1.5 pointer-events-none whitespace-nowrap">
          <div className="text-right mr-2">
            <p className="text-[15px] font-bold leading-none text-gray-900">{fulltime}</p>
            <p className="text-[11px] text-gray-500">Full-Time</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-white border-2 border-[#5a67d8]" />
        </div>
      )}

      {hovered === "freelance" && dash2 > 0 && (
        <div className="absolute top-4 -right-10 flex items-center bg-white/95 shadow-[0_4px_14px_-4px_rgba(16,24,40,0.25)] rounded-lg border border-gray-100 px-2.5 py-1.5 pointer-events-none whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-white border-2 border-[#f56565]" />
          <div className="ml-2">
            <p className="text-[15px] font-bold leading-none text-gray-900">{freelance}</p>
            <p className="text-[11px] text-gray-500">Freelance</p>
          </div>
        </div>
      )}
    </div>
  );
}