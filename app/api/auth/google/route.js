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
    
    // Get the current hostname for the redirect URI
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    
    console.log('🔍 OAuth initiation - redirect URI:', redirectUri);
    
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
