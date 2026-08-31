import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface RoomCardProps {
  title: string;
  description: string;
  actionLabel: string;
  icon?: ReactNode;
  badge?: string;
  variant?: "default" | "outline";
  onClick: () => void;
}

export default function RoomCard({
  title,
  description,
  actionLabel,
  icon,
  badge,
  variant = "default",
  onClick,
}: RoomCardProps) {
  const isPrimary = variant === "default";

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-7 transition-all duration-300 ${
        isPrimary
          ? "border-pink-500/30 bg-slate-900/80 hover:border-pink-500 hover:shadow-2xl hover:shadow-pink-950/40"
          : "border-white/10 bg-slate-900/60 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-950/30"
      } backdrop-blur-xl flex flex-col justify-between`}
    >
      {/* Glow highlight on top-right */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${
          isPrimary ? "bg-pink-500" : "bg-purple-500"
        }`}
      />

      <div>
        <div className="flex items-center justify-between mb-5">
          {icon && (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-300 ${
                isPrimary
                  ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
                  : "bg-purple-500/10 border-purple-500/20 text-purple-400"
              }`}
            >
              {icon}
            </div>
          )}
          {badge && (
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                isPrimary
                  ? "bg-pink-500/10 text-pink-300 border border-pink-500/20"
                  : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
              }`}
            >
              {badge}
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-white group-hover:text-pink-300 transition-colors">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-8">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`w-full h-12 rounded-xl text-sm font-semibold transition-all shadow-md ${
            isPrimary
              ? "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-600/25"
              : "border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200"
          }`}
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
