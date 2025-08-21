import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get the auth cookie
    const authCookie = request.cookies.get('auth_user');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'No authentication cookie found' 
      });
    }
    
    const userEmail = authCookie.value;
    
    // Check company domain restriction
    const companyDomain = process.env.COMPANY_DOMAIN;
    const allowedEmails = process.env.ALLOWED_EMAILS ? 
      process.env.ALLOWED_EMAILS.split(',').map(email => email.trim()) : [];
    
    if (companyDomain) {
      const userDomain = userEmail.split('@')[1];
      
      if (userDomain !== companyDomain && !allowedEmails.includes(userEmail)) {
        return NextResponse.json({ 
          authenticated: false, 
          message: 'Domain not allowed',
          userEmail,
          requiredDomain: companyDomain
        });
      }
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: { email: userEmail },
      message: 'Authentication successful' 
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      message: 'Authentication check failed',
      error: error.message 
    });
  }
}
