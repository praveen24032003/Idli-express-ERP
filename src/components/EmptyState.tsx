import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white/50 py-16 text-center">
      <Icon className="h-10 w-10 text-ink-300" />
      <div>
        <p className="font-semibold text-ink-700">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
