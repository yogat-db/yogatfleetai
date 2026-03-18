'use client'

export default function ParticlesBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 40%, #1e293b 0%, #020617 80%)',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}