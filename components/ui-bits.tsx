import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Bureau, Status, Channel } from "@/lib/mock";
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

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ElementType; style: string }> = {
  web: { label: "Web Portal", icon: Globe, style: "border-blue-200 bg-blue-50 text-blue-700" },
  mobile: { label: "Mobile App", icon: Smartphone, style: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  email: { label: "Email Intake", icon: Mail, style: "border-purple-200 bg-purple-50 text-purple-700" },
  whatsapp: { label: "WhatsApp Bot", icon: MessageSquare, style: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  helpline: { label: "National Helpline", icon: PhoneCall, style: "border-amber-200 bg-amber-50 text-amber-800" },
  "walk-in": { label: "Walk-In Docket", icon: UserCheck, style: "border-slate-300 bg-slate-100 text-slate-800" },
};

export function ChannelBadge({ channel }: { channel?: Channel }) {
  const conf = CHANNEL_CONFIG[channel || "web"] || CHANNEL_CONFIG.web;
  const Icon = conf.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        conf.style
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{conf.label}</span>
    </span>
  );
}

export function QrCodeView({
  value,
  size = 140,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1.5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => console.error("QR Code generation error:", err));

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn("flex items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400", className)}
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div className={cn("inline-block rounded-xl border border-slate-200 bg-white p-2 shadow-sm", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR Code for ${value}`}
        width={size}
        height={size}
        className="rounded-lg"
      />
    </div>
  );
}
