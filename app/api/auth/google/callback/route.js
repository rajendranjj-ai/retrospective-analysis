import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle OAuth error
    if (error) {
      console.error('Google OAuth error:', error);
      const clientUrl = process.env.CLIENT_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');
      return NextResponse.redirect(`${clientUrl}/login?error=oauth_failed`);
    }
    
    // Handle OAuth success code
    if (code) {
      // In development, redirect to Express server
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.redirect(`http://localhost:4005/auth/google/callback?code=${code}`);
      }
      
      // In production (Vercel), we would need to implement OAuth token exchange
      // For now, this is a simplified version that would need full OAuth implementation
      try {
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
            redirect_uri: `${process.env.CLIENT_URL || `https://${process.env.VERCEL_URL}`}/api/auth/google/callback`,
          }),
        });
        
        if (!tokenResponse.ok) {
          throw new Error('Token exchange failed');
        }
        
        const tokens = await tokenResponse.json();
        
        // Get user profile from Google
        const profileResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`);
        
        if (!profileResponse.ok) {
          throw new Error('Profile fetch failed');
        }
        
        const profile = await profileResponse.json();
        
        // Check company domain restriction
        const companyDomain = process.env.COMPANY_DOMAIN;
        const allowedEmails = process.env.ALLOWED_EMAILS ? 
          process.env.ALLOWED_EMAILS.split(',').map(email => email.trim()) : [];
        
        if (companyDomain) {
          const userDomain = profile.email.split('@')[1];
          if (userDomain !== companyDomain && !allowedEmails.includes(profile.email)) {
            const clientUrl = process.env.CLIENT_URL || `https://${process.env.VERCEL_URL}`;
            return NextResponse.redirect(`${clientUrl}/login?error=domain_not_allowed`);
          }
        }
        
        // For serverless deployment, we would store session in a database or JWT
        // This is a simplified version
        console.log('✅ Google OAuth successful for user:', profile.email);
        
        const clientUrl = process.env.CLIENT_URL || `https://${process.env.VERCEL_URL}`;
        return NextResponse.redirect(`${clientUrl}?auth=success`);
        
      } catch (tokenError) {
        console.error('OAuth token exchange error:', tokenError);
        const clientUrl = process.env.CLIENT_URL || `https://${process.env.VERCEL_URL}`;
        return NextResponse.redirect(`${clientUrl}/login?error=token_exchange_failed`);
      }
    }
    
    // No code or error - redirect to login
    const clientUrl = process.env.CLIENT_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');
    return NextResponse.redirect(`${clientUrl}/login`);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');
    return NextResponse.redirect(`${clientUrl}/login?error=callback_failed`);
  }
}
