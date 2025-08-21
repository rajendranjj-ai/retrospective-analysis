import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('Google OAuth client ID not configured');
      return NextResponse.redirect(new URL('/login?error=oauth_not_configured', request.url));
    }
    
    // Use a fixed redirect URI for production to ensure consistency
    let redirectUri;
    
    // Check if we're in development or production
    if (process.env.NODE_ENV === 'development') {
      // Development: use localhost
      redirectUri = 'http://localhost:3002/api/auth/google/callback';
    } else {
      // Production: use the exact URL configured in Google Cloud Console
      redirectUri = 'https://retrospective-analysis.vercel.app/api/auth/google/callback';
    }
    
    console.log('🔍 OAuth initiation - redirect URI:', redirectUri);
    console.log('🔍 Environment:', process.env.NODE_ENV);
    
    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    
    console.log('🔗 Redirecting to Google OAuth:', googleAuthUrl.toString());
    
    return NextResponse.redirect(googleAuthUrl.toString());
    
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_init_failed', request.url));
  }
}
