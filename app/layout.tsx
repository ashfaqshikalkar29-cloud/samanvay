import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { LanguageProvider } from "@/lib/i18n/context";
import { SimpleModeProvider } from "@/lib/simple-mode";
import { Header } from "@/components/header";
import { ComplainantChatbot } from "@/components/complainant-chatbot";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Samanvay – AICTE Integrated Grievance Dashboard",
  description: "Centralised complaint tracking with cross-bureau overlap detection.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0c2340",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <LanguageProvider>
          <SimpleModeProvider>
            <AppProvider>
              <PwaRegister />
              <Header />
              <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
              <footer className="border-t bg-white py-4 text-center text-xs text-slate-500">
                Samanvay · AICTE Integrated Grievance Coordination System · Built for Smart India Hackathon
              </footer>
              <ComplainantChatbot />
            </AppProvider>
          </SimpleModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
