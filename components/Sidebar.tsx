"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {

  const pathname = usePathname()

  const nav = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Vehicles", href: "/vehicles" },
    { name: "Service", href: "/service" },
    { name: "Diagnostics", href: "/diagnostics" },
    { name: "Command", href: "/command" },
    { name: "Operations", href: "/ops" },
    { name: "Settings", href: "/settings" }
  ]

  return (

    <div style={sidebar}>

      <h2 style={{ marginBottom: 20 }}>
        GarageAI
      </h2>

      {nav.map((item) => (

        <Link key={item.href} href={item.href} style={{
          ...link,
          background: pathname === item.href ? "#1e293b" : "transparent"
        }}>

          {item.name}

        </Link>

      ))}

    </div>

  )
}

const sidebar = {
  width: 220,
  background: "#020617",
  borderRight: "1px solid #1e293b",
  padding: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 8
}

const link = {
  padding: "10px",
  borderRadius: 6,
  color: "white",
  textDecoration: "none"
}