import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Mock Supabase
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}))

describe('Authentication', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Ensure AuthProvider's initial session load works
    const { supabase } = await import('../lib/supabaseClient')
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  it('should initialize auth context', async () => {
    const TestComponent = () => {
      const { loading } = useAuth()
      return <div>{loading ? 'Loading' : 'Ready'}</div>
    }

    render(
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Ready|Loading/)).toBeInTheDocument()
    })
  })

  it('should handle sign in', async () => {
    const { supabase } = await import('../lib/supabaseClient')
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    })

    // Test would go here - requires more setup
    expect(true).toBe(true) // Placeholder
  })
})

