"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, ArrowLeft, FilePen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm mb-4">
        <WifiOff className="h-8 w-8" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        You are Currently Offline
      </h1>

      <p className="mt-2 max-w-md text-sm text-slate-600">
        Samanvay PWA has cached your active session. You can still compose draft grievances locally. They will automatically synchronize when your internet connection is restored.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </Button>

        <Link href="/new">
          <Button
            variant="outline"
            className="flex items-center gap-2 text-xs border-slate-300"
          >
            <FilePen className="h-3.5 w-3.5" />
            Continue Draft Offline
          </Button>
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50/70 p-4 max-w-md text-left text-xs text-amber-900">
        <div className="font-semibold flex items-center gap-1.5 mb-1">
          <span>AICTE Offline Guarantee (Domain F)</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Grievances drafted during field visits or network blackouts are safely secured in your browser&apos;s encrypted LocalStorage and will trigger background sync upon reconnection.
        </p>
      </div>
    </div>
  );
}
