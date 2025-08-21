import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // In development, redirect to Express server
    if (process.env.NODE_ENV === 'development') {
      const response = await fetch('http://localhost:4005/auth/user', {
        credentials: 'include',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      } else {
        return NextResponse.json({ authenticated: false, user: null });
      }
    }
    
    // In production (Vercel), we would implement session checking here
    // For now, return not authenticated for Vercel deployment
    // This would need to be implemented with a proper session store
    return NextResponse.json({ 
      authenticated: false, 
      user: null,
      message: 'Session management not implemented for serverless deployment'
    });
    
  } catch (error) {
    console.error('Auth user check error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      user: null,
      error: 'Authentication check failed'
    });
  }
}
