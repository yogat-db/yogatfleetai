"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleResetPassword() {
    try {
      setLoading(true)
      setError("")
      setMessage("")

      if (!email.trim()) {
        setError("Please enter your email address")
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (error) {
        throw error
      }

      setMessage("Password reset link sent. Please check your email.")
      setEmail("")
    } catch (err: any) {
      setError(err.message || "Failed to send reset link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={title}>Reset Password</h1>

        <p style={subtitle}>
          Enter your email address and we will send you a password reset link.
        </p>

        <label style={label}>Email Address</label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          style={input}
        />

        <button
          onClick={handleResetPassword}
          disabled={loading}
          style={button}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {message && <div style={successBox}>{message}</div>}
        {error && <div style={errorBox}>{error}</div>}

        <div style={linksRow}>
          <a href="/auth/login" style={link}>
            Back to Login
          </a>

          <a href="/auth/otp" style={link}>
            Login with Phone OTP
          </a>
        </div>
      </div>
    </div>
  )
}

const page: any = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
}

const card: any = {
  width: "100%",
  maxWidth: 460,
  padding: 24,
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: 12,
}

const title: any = {
  fontSize: 32,
  fontWeight: 800,
  margin: 0,
}

const subtitle: any = {
  opacity: 0.75,
  lineHeight: 1.5,
  marginBottom: 8,
}

const label: any = {
  fontSize: 14,
  fontWeight: 600,
  marginTop: 4,
}

const input: any = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  outline: "none",
}

const button: any = {
  marginTop: 8,
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#6366f1",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
}

const successBox: any = {
  marginTop: 8,
  padding: 12,
  borderRadius: 10,
  background: "rgba(34,197,94,0.12)",
  color: "#86efac",
}

const errorBox: any = {
  marginTop: 8,
  padding: 12,
  borderRadius: 10,
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
}

const linksRow: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 10,
  flexWrap: "wrap",
}

const link: any = {
  color: "#a5b4fc",
  textDecoration: "none",
  fontSize: 14,
}