import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle OAuth error
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect('/login?error=oauth_failed');
    }
    
    // Handle OAuth success code
    if (code) {
      try {
        // Get the current hostname for the redirect URI
        const host = request.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
        
        console.log('🔍 Using redirect URI:', redirectUri);
        
        // Exchange code for tokens with Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', errorText);
          return NextResponse.redirect('/login?error=token_exchange_failed');
        }
        
        const tokens = await tokenResponse.json();
        
        // Get user profile from Google
        const profileResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`);
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          console.error('Profile fetch failed:', errorText);
          return NextResponse.redirect('/login?error=profile_fetch_failed');
        }
        
        const profile = await profileResponse.json();
        console.log('✅ Google OAuth successful for user:', profile.email);
        
        // Check company domain restriction
        const companyDomain = process.env.COMPANY_DOMAIN;
        const allowedEmails = process.env.ALLOWED_EMAILS ? 
          process.env.ALLOWED_EMAILS.split(',').map(email => email.trim()) : [];
        
        if (companyDomain) {
          const userDomain = profile.email.split('@')[1];
          console.log('🔍 Checking domain access:', { userDomain, companyDomain, allowedEmails });
          
          if (userDomain !== companyDomain && !allowedEmails.includes(profile.email)) {
            console.log('🚫 Domain access denied for:', profile.email);
            return NextResponse.redirect('/login?error=domain_not_allowed');
          }
        }
        
        // Create a simple authentication response
        const response = NextResponse.redirect('/?auth=success');
        
        // Set a simple auth cookie (for demo purposes)
        response.cookies.set('auth_user', profile.email, {
          httpOnly: true,
          secure: protocol === 'https',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 // 24 hours
        });
        
        console.log('✅ Setting auth cookie and redirecting to dashboard');
        return response;
        
      } catch (tokenError) {
        console.error('OAuth token exchange error:', tokenError);
        return NextResponse.redirect('/login?error=token_exchange_failed');
      }
    }
    
    // No code or error - redirect to login
    return NextResponse.redirect('/login');
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect('/login?error=callback_failed');
  }
}
