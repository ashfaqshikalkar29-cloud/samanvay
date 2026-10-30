"use client";

import { useEffect, useState } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          setSwRegistered(true);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });
    }

    // 2. Connectivity Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="font-medium">
          Offline Mode Active: Changes and drafts will be stored locally and synced when connection returns.
        </span>
      </div>
    </div>
  );
}
