import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Set cache control headers to prevent caching
    const response = NextResponse.json({ 
      authenticated: false, 
      message: 'No authentication cookie found' 
    });
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    // Get the auth cookie
    const authCookie = request.cookies.get('auth_user');
    
    if (!authCookie || !authCookie.value) {
      return response;
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
        }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: { email: userEmail },
      message: 'Authentication successful' 
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      message: 'Authentication check failed',
      error: error.message 
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
