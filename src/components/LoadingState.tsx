import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-400">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
