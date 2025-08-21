import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In development, redirect to Express server
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.redirect('http://localhost:4005/auth/google');
    }
    
    // In production (Vercel), construct Google OAuth URL directly
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.CLIENT_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-app.vercel.app'}/api/auth/google/callback`;
    
    const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=profile email&` +
      `access_type=offline&` +
      `prompt=consent`;

    return NextResponse.redirect(googleAuthURL);
    
  } catch (error) {
    console.error('Google auth redirect error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
