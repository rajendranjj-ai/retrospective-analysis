import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Test API endpoint called successfully');
    
    return NextResponse.json({ 
      message: 'Test API is working!',
      timestamp: new Date().toISOString(),
      status: 'success'
    });
    
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 