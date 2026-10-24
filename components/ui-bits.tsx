import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Bureau, Status } from "@/lib/mock";
import type { SlaState } from "@/lib/sla";

/** Styled link that looks like a Button — replaces <Button asChild> pattern. */
export function LinkButton({
  href,
  children,
  variant = "default",
  size = "default",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "link" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}

const STATUS_STYLES: Record<Status, string> = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  "In-Process": "border-blue-200 bg-blue-50 text-blue-700",
  Disposed: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

export function BureauBadge({ bureau }: { bureau: Bureau }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold tracking-wide",
        bureau === "RB"
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-teal-200 bg-teal-50 text-teal-700"
      )}
    >
      {bureau}
    </Badge>
  );
}

const SLA_STYLES: Record<SlaState, string> = {
  "On track": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Due soon": "border-amber-200 bg-amber-50 text-amber-700",
  Overdue: "border-red-200 bg-red-50 text-red-700",
  Closed: "border-slate-200 bg-slate-50 text-slate-500",
};

export function SlaBadge({ state, daysLeft }: { state: SlaState; daysLeft: number }) {
  const label =
    state === "Closed"
      ? "Closed"
      : state === "Overdue"
      ? `${-daysLeft}d overdue`
      : state === "Due soon"
      ? `${daysLeft}d left`
      : `${daysLeft}d left`;
  return (
    <Badge variant="outline" className={cn("font-medium whitespace-nowrap", SLA_STYLES[state])}>
      {label}
    </Badge>
  );
}

// Fixed locale + timezone so server and client render identical text (no hydration warnings)
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
