"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"

export default function AuthPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const redirectTo = sp.get("redirectTo") || "/dashboard"
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)

    try {
      if (!email.trim()) throw new Error("Enter your email.")

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
              redirectTo
            )}`,
          },
        })
        if (error) throw error
        setMsg("✅ Check your email for the login link.")
        return
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters.")
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
              redirectTo
            )}`,
          },
        })
        if (error) throw error
        setMsg("✅ Account created. Check your email to confirm, then you’ll be redirected.")
        return
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      router.push(redirectTo)
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.brandRow}>
          <div style={S.dot} />
          <div>
            <div style={S.title}>GarageAI</div>
            <div style={S.sub}>Sign in to your vehicle command center</div>
          </div>
        </div>

        <div style={S.tabs}>
          <button
            style={{ ...S.tab, ...(mode === "signin" ? S.tabActive : {}) }}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          <button
            style={{ ...S.tab, ...(mode === "signup" ? S.tabActive : {}) }}
            onClick={() => setMode("signup")}
            type="button"
          >
            Create account
          </button>
          <button
            style={{ ...S.tab, ...(mode === "magic" ? S.tabActive : {}) }}
            onClick={() => setMode("magic")}
            type="button"
          >
            Magic link
          </button>
        </div>

        <form onSubmit={onSubmit} style={S.form}>
          <label style={S.label}>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={S.input}
              autoComplete="email"
            />
          </label>

          {mode !== "magic" && (
            <label style={S.label}>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={S.input}
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>
          )}

          <button style={S.primary} disabled={loading}>
            {loading
              ? "Working..."
              : mode === "signin"
              ? "Sign in"
              : mode === "signup"
              ? "Create account"
              : "Send magic link"}
          </button>

          {msg && <div style={S.msg}>{msg}</div>}

          <div style={S.note}>
            Redirect after login:{" "}
            <span style={{ fontFamily: "monospace", opacity: 0.9 }}>{redirectTo}</span>
          </div>
        </form>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "radial-gradient(1200px 600px at 20% 10%, rgba(124,58,237,0.25), transparent), #0b0f17",
    color: "white",
  },
  card: {
    width: "min(520px, 100%)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
    padding: 18,
  },
  brandRow: { display: "flex", gap: 12, alignItems: "center", marginBottom: 14 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
  },
  title: { fontSize: 18, fontWeight: 900 },
  sub: { fontSize: 13, opacity: 0.75, marginTop: 2 },

  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  tabActive: {
    background: "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(124,58,237,0.35))",
    color: "white",
  },

  form: { display: "grid", gap: 12 },
  label: { display: "grid", gap: 6, fontSize: 12, fontWeight: 800, opacity: 0.9 },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
  },
  primary: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "white",
    background: "linear-gradient(90deg,#2563eb,#7c3aed)",
  },
  msg: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    fontSize: 13,
    opacity: 0.95,
  },
  note: { marginTop: 4, fontSize: 12, opacity: 0.65 },
}