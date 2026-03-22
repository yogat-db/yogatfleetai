import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import ParticlesBackground from "@/components/ParticlesBackground";

export const metadata = {
  title: "Yogat Fleet AI",
  description: "Fleet Intelligence & Predictive Diagnostics Platform",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning style={{ background: "#020617", margin: 0, color: "white" }}>
        <ParticlesBackground />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
