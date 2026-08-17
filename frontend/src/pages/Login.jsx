import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("admin@equinox.ai");
  const [password, setPassword] = useState("Equinox@2026");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, email, password, organization_name: org });
      }
      toast.success("Welcome to Equinox Reviews Intelligence");
      navigate("/");
    } catch (err) {
      setError(apiErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen w-full bg-[#0A0A0B] lg:grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/[0.06] p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.14),transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_24px_rgba(59,130,246,0.4)]">
            <span className="font-display text-lg font-extrabold text-white">E</span>
          </div>
          <div>
            <div className="font-display text-lg font-bold text-zinc-50">Equinox</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Reviews Intelligence</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-zinc-50">
            Turn app-store reviews into <span className="text-amber-400">intelligence</span>.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Monitor Google Play & App Store reputation, generate AI replies, forecast ratings and
            outmaneuver competitors — all in one premium command center.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Sparkles, t: "AI review replies & sentiment analysis" },
              { icon: TrendingUp, t: "Rating forecasting & competitor intelligence" },
              { icon: ShieldCheck, t: "Multi-tenant, role-based & secure" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                <f.icon size={16} className="text-blue-400" /> {f.t}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[11px] text-zinc-400">
          Build By <span className="text-rose-500">♥️</span> From Equinox Marketing Agency
        </div>
      </div>

      {/* Right form */}
      <div className="flex min-h-screen items-center justify-center p-6 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700">
              <span className="font-display text-lg font-extrabold text-white">E</span>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-zinc-50">Equinox</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">Reviews Intelligence</div>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-zinc-50">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "login" ? "Access your reputation command center." : "Start monitoring your app reputation."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <Label className="text-xs text-zinc-400">Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5 bg-[#121214] border-white/[0.08]" data-testid="register-name" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Organization</Label>
                  <Input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Acme Inc" className="mt-1.5 bg-[#121214] border-white/[0.08]" data-testid="register-org" />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs text-zinc-400">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 bg-[#121214] border-white/[0.08]" data-testid="login-email" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 bg-[#121214] border-white/[0.08]" data-testid="login-password" />
            </div>

            {error && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400" data-testid="login-error">{error}</div>}

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500" data-testid="login-submit">
              {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-zinc-500">
            {mode === "login" ? "New to Equinox?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="font-medium text-blue-400 hover:text-blue-300"
              data-testid="toggle-mode"
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>

          {mode === "login" && (
            <div className="mt-6 rounded-lg border border-white/[0.06] bg-[#121214] p-3 text-[11px] text-zinc-500">
              <div className="font-medium text-zinc-400 mb-1">Demo credentials</div>
              Super Admin — admin@equinox.ai / Equinox@2026
            </div>
          )}

          <div className="mt-8 text-center text-xs text-zinc-500">
            Build By <span className="text-rose-500">♥️</span> From Equinox Marketing Agency
          </div>
        </div>
      </div>
    </div>
  );
}
