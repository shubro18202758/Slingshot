"use client";

import { cn } from "@/lib/utils";

interface IITOption {
  id: string;
  label: string;
  color: string;
}

interface IITFilterBarProps {
  options: IITOption[];
  selected: string;
  onSelect: (id: string) => void;
}

export function IITFilterBar({ options, selected, onSelect }: IITFilterBarProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-mono transition-all border",
            selected === opt.id
              ? "bg-[#21262d] text-white border-white/30"
              : "bg-[#161b22] text-gray-500 border-[#30363d] hover:text-gray-300"
          )}
          style={{
            borderColor: selected === opt.id ? opt.color : undefined,
            color: selected === opt.id ? opt.color : undefined,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
