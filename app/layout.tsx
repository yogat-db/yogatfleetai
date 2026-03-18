import { supabaseAdmin } from '@/lib/supabase/admin'
import "./globals.css"
import type { ReactNode } from "react"
import AppShell from "@/components/AppShell"
import ParticlesBackground from "@/components/ParticlesBackground"

export const metadata = {
  title: "Yogat Fleet AI",
  description: "Fleet Intelligence & Predictive Diagnostics Platform",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#020617", margin: 0, color: "white" }}>
        {/* Visual Layer */}
        <ParticlesBackground />
        
        {/* Functional Layer */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

