import { cn } from "@/lib/utils";

type LevelName =
  | "Junior"
  | "Confirmed"
  | "Senior"
  | "Lead"
  | "Manager"
  | "Consultant"
  | "Founding";
type LevelColor = "teal" | "blue" | "pink" | "purple";

interface LevelConfig {
  bars: number;
  color: LevelColor;
}

const LEVEL_CONFIG: Record<LevelName, LevelConfig> = {
  Junior: { bars: 1, color: "teal" },
  Confirmed: { bars: 2, color: "blue" },
  Consultant: { bars: 2, color: "blue" },
  Senior: { bars: 3, color: "pink" },
  Manager: { bars: 4, color: "pink" },
  Lead: { bars: 4, color: "purple" },
  Founding: { bars: 4, color: "purple" },
};

const COLOR_CLASSES: Record<LevelColor, { bar: string; text: string }> = {
  teal: { bar: "bg-teal-6", text: "text-teal-12" },
  blue: { bar: "bg-blue-400", text: "text-blue-500" },
  pink: { bar: "bg-pink-400", text: "text-pink-500" },
  purple: { bar: "bg-purple-400", text: "text-purple-500" },
};

const BAR_HEIGHTS = ["h-4", "h-4", "h-4", "h-4"] as const;

interface LevelIndicatorProps {
  level: LevelName;
  className?: string;
}

export function LevelIndicator({ level, className }: LevelIndicatorProps) {
  const cfg = LEVEL_CONFIG[level] ?? { bars: 1, color: "yellow" as LevelColor };
  const colors = COLOR_CLASSES[cfg.color];

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="flex items-end gap-0.75">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-xs transition-colors",
              h,
              i < cfg.bars ? colors.bar : "bg-zinc-200",
            )}
          />
        ))}
      </div>
      <span className={cn("text-xs font-medium", colors.text)}>{level}</span>
    </div>
  );
}
