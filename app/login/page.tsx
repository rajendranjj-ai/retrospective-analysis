'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Login from '@/components/Login'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
      
      // Set user-friendly error messages
      switch (errorParam) {
        case 'oauth_failed':
          setErrorMessage('Google OAuth authentication failed. Please try again.')
          break
        case 'token_exchange_failed':
          setErrorMessage('Authentication token exchange failed. Please try again.')
          break
        case 'profile_fetch_failed':
          setErrorMessage('Failed to retrieve user profile. Please try again.')
          break
        case 'domain_not_allowed':
          setErrorMessage('Access denied. This application is restricted to authorized users only.')
          break
        case 'callback_failed':
          setErrorMessage('Authentication callback failed. Please try again.')
          break
        default:
          setErrorMessage('An authentication error occurred. Please try again.')
      }
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Authentication Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Login />
    </div>
  )
}
