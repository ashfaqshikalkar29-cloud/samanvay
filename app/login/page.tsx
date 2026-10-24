"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSupabaseMode = process.env.NEXT_PUBLIC_DATA_MODE === "supabase";
  const hasSupabaseKeys = isSupabaseConfigured();

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("Samanvay@2026");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter both email address and password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!isSupabaseMode) {
          // In memory mode, just navigate to dashboard
          router.push("/");
          return;
        }
        throw new Error("Supabase is not configured. Please check environment variables.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Invalid login credentials. Please check your email and password.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Successful login
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Tricolour bar accent */}
        <div className="flex h-1.5 overflow-hidden rounded-full shadow-sm">
          <div className="flex-1 bg-orange-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
        </div>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-md ring-4 ring-blue-100">
              <Landmark className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-blue-950">
                Samanvay Portal Sign In
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
                AICTE · Integrated Grievance Coordination
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span className="text-xs leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {!isSupabaseMode && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  Running in In-Memory Mode
                </div>
                <p className="text-slate-600 leading-normal">
                  Supabase authentication is optional. You can sign in using credentials or jump directly into the demo dashboard with the role switcher.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full bg-white text-blue-900 border-blue-300 hover:bg-blue-100 text-xs h-7"
                  onClick={() => router.push("/")}
                >
                  Enter Demo Dashboard Directly <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Official Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="officer@aicte-india.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-950 hover:bg-blue-900 text-white font-medium shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  "Sign In to Console"
                )}
              </Button>
            </form>

            {/* Demo Quick Fills */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-2.5">
                SIH Evaluation · Quick Fill Test Accounts
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200 hover:bg-slate-50 font-normal"
                  onClick={() => handleQuickFill("admin@samanvay.demo")}
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200 hover:bg-slate-50 font-normal"
                  onClick={() => handleQuickFill("rb@samanvay.demo")}
                >
                  RB Officer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200 hover:bg-slate-50 font-normal"
                  onClick={() => handleQuickFill("pgrc@samanvay.demo")}
                >
                  PGRC Officer
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Pass: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Samanvay@2026</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
