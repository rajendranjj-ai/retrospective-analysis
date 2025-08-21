// Authentication Configuration
require('dotenv').config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const isVercel = process.env.VERCEL === '1';

// Determine URLs based on environment
const getServerURL = () => {
  if (process.env.SERVER_URL) return process.env.SERVER_URL;
  if (isVercel) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:4005';
};

const getClientURL = () => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  if (isVercel) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3002';
};

const authConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id_here',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here',
    callbackURL: `${getServerURL()}/auth/google/callback`
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !isDevelopment, // HTTPS in production, HTTP in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isDevelopment ? 'lax' : 'none', // Cross-site cookies for production
      domain: isDevelopment ? undefined : process.env.COOKIE_DOMAIN
    }
  },
  client: {
    url: getClientURL()
  },
  company: {
    domain: process.env.COMPANY_DOMAIN, // e.g., "company.com"
    allowedEmails: process.env.ALLOWED_EMAILS ? 
      process.env.ALLOWED_EMAILS.split(',').map(email => email.trim()) : []
  }
};

module.exports = authConfig;
