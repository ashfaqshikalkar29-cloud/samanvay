import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Samanvay – AICTE Integrated Grievance Dashboard",
  description: "Centralised complaint tracking with cross-bureau overlap detection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <AppProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          <footer className="border-t bg-white py-4 text-center text-xs text-slate-500">
            Samanvay · Prototype built for Smart India Hackathon · All data shown is fictional
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
