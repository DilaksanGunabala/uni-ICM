import { cn } from "@/lib/utils";
import { MarkStatus } from "@/types";

interface StatusBadgeProps {
  status: MarkStatus;
  className?: string;
}

const statusConfig: Record<MarkStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/15 text-warning border border-warning/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/15 text-success border border-success/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/15 text-destructive border border-destructive/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
