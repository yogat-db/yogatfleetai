"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [loading, setLoading] = useState(false)

  return (
    <button
      onClick={async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push("/auth")
        setLoading(false)
      }}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
        color: "white",
        cursor: "pointer",
        fontWeight: 900,
      }}
      disabled={loading}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  )
}