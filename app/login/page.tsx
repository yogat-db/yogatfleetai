'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Redirect to add vehicle page on success
      router.push('/vehicles/add')
      router.refresh()
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#fff',
      padding: '20px'
    }}>
      <div style={{
        background: '#121212',
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          marginBottom: '24px',
          textAlign: 'center',
          color: '#22c55e'
        }}>
          Yogat Fleet AI
        </h1>
        
        <h2 style={{
          fontSize: '1.2rem',
          marginBottom: '24px',
          textAlign: 'center',
          color: '#fff'
        }}>
          Login to Your Account
        </h2>
        
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <label style={{
              fontSize: '0.9rem',
              color: '#aaa'
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: '12px',
                background: '#1c1c1c',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none'
              }}
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <label style={{
              fontSize: '0.9rem',
              color: '#aaa'
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: '12px',
                background: '#1c1c1c',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none'
              }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              color: '#ff4d4d',
              fontSize: '0.9rem',
              padding: '8px',
              background: 'rgba(255, 77, 77, 0.1)',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '12px',
              background: '#22c55e',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              marginTop: '12px'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#666',
          fontSize: '0.9rem'
        }}>
          Don't have an account? Contact your administrator
        </p>
      </div>
    </div>
  )
}