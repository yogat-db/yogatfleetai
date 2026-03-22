'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import theme from '@/app/theme'

const MyComponent = () => (
  <div style={{ background: theme.colors.background.main, color: theme.colors.text.primary }}>
    <h1 style={{ background: theme.gradients.title, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
      Hello
    </h1>
  </div>
)
interface QrScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false)
    scannerRef.current = scanner
    scanner.render(
      (decodedText) => { onScan(decodedText); scanner.clear() },
      (errorMessage) => setError(errorMessage)
    )
    return () => { scanner.clear().catch(console.error) }
  }, [])

  return (
    <div style={styles.container}>
      <div id="qr-reader" style={{ width: '100%' }} />
      {error && <div style={styles.error}>Camera error: {error}</div>}
      <button onClick={onClose} style={styles.closeButton}>✕</button>
    </div>
  )
}

const styles = {
  container: { position: 'relative', marginTop: 10, borderRadius: 8, overflow: 'hidden', background: '#000' },
  closeButton: {
    position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff',
    border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
  },
  error: { padding: 10, background: '#ef4444', color: '#fff', textAlign: 'center' },
} as const