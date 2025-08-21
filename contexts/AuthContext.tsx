'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  picture: string
  provider: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Determine API base URL based on environment
  const getAPIBaseURL = () => {
    if (typeof window === 'undefined') return '' // Server-side
    
    // Check if we're in development
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:4005'
    }
    
    // In production, use the same origin (Vercel handles routing)
    return window.location.origin
  }

  const apiBaseURL = getAPIBaseURL()

  const checkAuth = async () => {
    try {
      // In development, use the Express server
      if (window.location.hostname === 'localhost') {
        const response = await fetch(`${apiBaseURL}/auth/user`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated && data.user) {
            setUser(data.user)
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } else {
        // In production (Vercel), use the new auth check endpoint
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated && data.user) {
            // Create a user object from the email
            setUser({
              id: data.user.email,
              email: data.user.email,
              name: data.user.email.split('@')[0],
              firstName: data.user.email.split('@')[0],
              lastName: '',
              picture: '',
              provider: 'google'
            })
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = () => {
    // In development, use Express server
    if (window.location.hostname === 'localhost') {
      window.location.href = `${apiBaseURL}/auth/google`
    } else {
      // In production, use Vercel OAuth
      window.location.href = '/api/auth/google'
    }
  }

  const logout = async () => {
    try {
      console.log('🔐 Logout initiated');
      
      if (window.location.hostname === 'localhost') {
        // In development, use Express server
        const response = await fetch(`${apiBaseURL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setUser(null);
          console.log('Logged out successfully (development)');
        }
      } else {
        // In production, call our logout API and clear all cookies
        try {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log('✅ Logout API call successful');
          }
        } catch (apiError) {
          console.warn('⚠️ Logout API call failed, clearing cookies locally:', apiError);
        }
        
        // Clear all cookies locally as backup
        document.cookie = 'auth_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
        document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
        document.cookie = 'g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax';
        
        // Clear localStorage and sessionStorage
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        
        setUser(null);
        console.log('✅ All local storage and cookies cleared');
      }
      
      // Force a hard refresh to clear any cached state
      console.log('🔄 Forcing page refresh to clear cache');
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Even if logout fails, clear user state and refresh
      setUser(null);
      window.location.href = '/';
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  // Check for auth success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'success') {
      // Remove auth parameter from URL
      window.history.replaceState({}, '', window.location.pathname)
      // Re-check auth status
      checkAuth()
    }
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
