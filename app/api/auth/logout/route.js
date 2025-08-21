import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔐 Logout request received');
    
    // Create response
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
    // Clear all authentication cookies
    response.cookies.set('auth_user', '', {
      expires: new Date(0),
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: true
    });
    
    // Clear any other potential auth cookies
    response.cookies.set('auth_token', '', {
      expires: new Date(0),
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: true
    });
    
    // Clear session cookies
    response.cookies.set('session', '', {
      expires: new Date(0),
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: true
    });
    
    // Clear any Google OAuth related cookies
    response.cookies.set('g_state', '', {
      expires: new Date(0),
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: false
    });
    
    console.log('✅ All authentication cookies cleared');
    
    return response;
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Logout failed',
      error: error.message 
    }, { status: 500 });
  }
}
