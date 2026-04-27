'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertCircle } from 'lucide-react'
import theme from '@/app/theme'

interface QrScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const regionId = "qr-reader-region"

  useEffect(() => {
    // 1. Initialize Headless Scanner
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" }, // Prioritize back camera
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText)
            stopScanner()
          },
          () => { /* Silent failure for frames without QR */ }
        )
        setIsScanning(true)
      } catch (err: any) {
        setError("Camera permission denied or not found.")
        console.error(err)
      }
    }

    startScanner()

    return () => {
      stopScanner()
    }
  }, [onScan])

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
      await scannerRef.current.clear()
    }
  }

  return (
    <div style={{
      ...theme.glass,
      position: 'relative',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      border: `1px solid ${theme.colors.border.medium}`,
      background: '#000'
    }}>
      {/* --- Scanning Region --- */}
      <div id={regionId} style={{ width: '100%', aspectRatio: '1/1' }} />

      {/* --- Custom UI Overlays --- */}
      <div style={styles.overlayContainer}>
        {/* Animated Scan Line */}
        {isScanning && <div style={styles.scanLine} />}
        
        {/* Corner Brackets */}
        <div style={styles.viewport} />
      </div>

      {/* --- Error Toast --- */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* --- Close Button --- */}
      <button 
        onClick={() => { stopScanner(); onClose(); }} 
        style={styles.closeButton}
      >
        <X size={20} />
      </button>

      {/* --- Status Footer --- */}
      <div style={styles.footer}>
        <Camera size={14} color={theme.colors.primary} />
        <span style={{ fontSize: theme.fontSizes.xs, fontWeight: 600 }}>
          Align QR code within the frame
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlayContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewport: {
    width: 250,
    height: 250,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 24,
    boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.5)', // Dims the outside area
  },
  scanLine: {
    position: 'absolute',
    width: 250,
    height: 2,
    background: '#22c55e', // theme.colors.primary
    boxShadow: '0 0 15px #22c55e',
    animation: 'scan-move 2s linear infinite',
    zIndex: 11,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '50%',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 20,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    background: '#ef4444',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '12px',
    zIndex: 20,
  },
  footer: {
    padding: '12px',
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }
}