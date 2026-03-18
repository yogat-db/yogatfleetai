'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface QrScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Create scanner instance
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      false // verbose
    )
    scannerRef.current = scanner

    scanner.render(
      (decodedText) => {
        // Success callback
        onScan(decodedText)
        scanner.clear()
      },
      (errorMessage) => {
        // Error callback – could be camera busy, permission denied, etc.
        console.warn('QR scan error', errorMessage)
        setError('Camera error or permission denied. Please try again.')
        setIsInitializing(false)
      }
    )

    // Simulate initialization complete after a short delay
    const timer = setTimeout(() => setIsInitializing(false), 500)

    // Cleanup on unmount
    return () => {
      clearTimeout(timer)
      scanner.clear().catch(console.error)
    }
  }, [onScan])

  return (
    <div style={styles.container}>
      {isInitializing && (
        <div style={styles.overlay}>
          <div style={styles.spinner} />
          <p>Initializing camera...</p>
        </div>
      )}
      {error && (
        <div style={styles.errorBox}>
          <p>{error}</p>
          <button onClick={onClose} style={styles.closeErrorButton}>
            Close
          </button>
        </div>
      )}
      <div id="qr-reader" style={{ width: '100%' }} />
      <button onClick={onClose} style={styles.closeButton} aria-label="Close scanner">
        ✕
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    marginTop: '10px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#000',
    minHeight: '250px',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    color: '#fff',
  },
  spinner: {
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #22c55e',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '10px',
  },
  errorBox: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#0f172a',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    color: '#ef4444',
    zIndex: 10,
  },
  closeErrorButton: {
    marginTop: '10px',
    background: '#22c55e',
    color: '#020617',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 12px',
    cursor: 'pointer',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    fontSize: '16px',
    cursor: 'pointer',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}

// Add global keyframes for spinner (if not already in your global CSS)
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}