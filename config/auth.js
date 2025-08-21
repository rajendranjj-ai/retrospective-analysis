// Authentication Configuration
require('dotenv').config();

const authConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id_here',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here',
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:4005'}/auth/google/callback`
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:3002'
  }
};

module.exports = authConfig;
