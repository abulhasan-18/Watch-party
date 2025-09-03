import { Button } from "@/components/ui/button";

export default function RoomCard({
  title,
  description,
  actionLabel,
  onClick,
  variant = "default",
}: {
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  variant?: "default" | "outline";
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-white/[0.06] p-6 shadow-sm">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      <Button onClick={onClick} variant={variant} className="mt-5 w-full h-11">
        {actionLabel}
      </Button>
    </div>
  );
}
