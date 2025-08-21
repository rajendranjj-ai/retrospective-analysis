import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // In development, redirect to Express server
    if (process.env.NODE_ENV === 'development') {
      const response = await fetch('http://localhost:4005/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const nextResponse = NextResponse.json(data);
        
        // Clear any cookies
        nextResponse.cookies.delete('connect.sid');
        nextResponse.cookies.delete('session');
        
        return nextResponse;
      } else {
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
      }
    }
    
    // In production (Vercel), implement session clearing
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully (serverless)' 
    });
    
    // Clear session cookies
    response.cookies.delete('connect.sid');
    response.cookies.delete('session');
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ 
      error: 'Logout failed',
      message: error.message 
    }, { status: 500 });
  }
}
